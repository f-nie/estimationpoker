import { exec } from 'child_process';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from "socket.io";
import { errWithTime, logWithTime } from './util';

type Answer = {
	rank: number;
	name: string;
	answer: number;
	deviation: number;
	percentage: number;
	time: number;
}
export class EstimatorServer {

	// constants
	private port = 3000;

	// runtime variables
	private app: express.Application;
	private httpServer: ReturnType<typeof createServer>;
	private socketServer: Server;

	// app variables
	private estimations = new Map<string, number>();    // key: name, value: answer
	private task: string = "";
	private isClosed: boolean = false;
	private hostSubscriberId: string = "";


	constructor() {
		this.app = express();
		this.httpServer = createServer(this.app);
		this.socketServer = new Server(this.httpServer);
	}

	public start() {
		this.app.use(express.json());
		this.app.use(express.static(path.join(__dirname, '..', 'web')));

		this.socketServer.on('connection', (socket) => {

			// host events
			socket.on('subscribe', (topic) => {
				socket.join(topic);
				this.hostSubscriberId = topic;
			});

			socket.on('unsubscribe', (topic) => {
				socket.leave(topic);
				this.hostSubscriberId = "";
			});

			socket.on('newRound', (event) => {
				this.setNewRound(event);
			});

			socket.on('closeRound', () => {
				this.closeRound();
			});

			socket.on('revealResult', () => {
				this.revealResult();
			});

			socket.on('clearRound', () => {
				this.clearRound();
			});

			// player events
			socket.on('addEstimation', (event) => {
				this.addEstimation(event);
			});
		});

		this.httpServer.listen(this.port, () => {
			logWithTime(`Server is running at http://localhost:${this.port}`);
		});

		// client pages

		this.app.get('/player', (req, res) => {
			res.sendFile(path.join(__dirname, '..', 'web', 'player.html'));
		});

		this.app.get('/host', (req, res) => {
			res.sendFile(path.join(__dirname, '..', 'web', 'host.html'));
		});

		this.app.get('/icon.png', (req, res) => {
			res.sendFile(path.join(__dirname, '..', 'web/images', 'icon.png'));
		});

		// host services

		this.app.get('/getEstimations', (req, res) => {         // service for answer polling is implemented as a redunandancy to the unreliable socket.io connection
			const hostId = req.query.hostId as string;
			if (hostId !== this.hostSubscriberId) {
				res.status(403).send('Forbidden');
				return;
			}
			res.json(this.estimations);
		});

		// player services

		this.app.get('/getTask', (req, res) => {
			res.json({
				question: this.task,
				isClosed: this.isClosed     // required to retrieve state when loading player ui
			});
		});

		// debugging services

		this.app.get('/logs', (req, res) => {
			exec('tail -n 100 db/logs.log', (error, stdout, stderr) => {
				if (error) {
					res.status(500).send(`Error: ${error.message}`);
					errWithTime(error.message);
					return;
				}
				if (stderr) {
					res.status(500).send(`Stderr: ${stderr}`);
					errWithTime(stderr);
					return;
				}
				res.send(`<pre>${stdout}</pre>`);
			});
		});
	}

	private clearRound() {
		this.task = "";
		this.isClosed = false;
		this.estimations.clear();
		this.socketServer.emit('newRound', this.task);
	}

	private setNewRound(task: string) {
		this.clearRound();
		this.task = task;
		this.socketServer.emit('isClosed', false);
		this.socketServer.emit('newRound', this.task);
	}

	private closeRound() {
		this.isClosed = true;
		this.socketServer.emit('isClosed', true);
	}

	private revealResult() {
		this.socketServer.emit('estimations', this.estimations);
	}

	private addEstimation(event: any) {
		if (this.isClosed) {
			return;
		}
		this.estimations.set(event.name, event.estimation);
		this.socketServer.to(this.hostSubscriberId).emit('newEstimation', this.estimations);
		this.socketServer.emit('intermediateEstimations', Array.from(this.estimations.keys()));
	}
}
