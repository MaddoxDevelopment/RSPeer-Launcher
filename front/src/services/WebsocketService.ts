import {Electron} from "../util/Electron";
import {User} from "../models/User";
import {ApiService} from "./ApiService";
import {guid} from "../util/Util";

const axios = Electron.require('axios');
const io = Electron.require('socket.io-client');
const os = Electron.require('os');

export interface WebsocketOptions {
    onConnect? : () => any
    onDisconnect? : () => any
    onMessage? : (message : any) => any
    onError? : (err : any) => any
}

export class WebsocketService {
    
    private socket : any;
    private apiService: ApiService;
    private readonly identifier : string;
    
    constructor(apiService: ApiService) {
        this.apiService = apiService;
        this.identifier = guid();
    }
    
    public getSocket() {
        return this.socket;
    }
    
    public getIdentifier() {
        return this.identifier;
    }
    
    public isConnected() {
        return this.socket && this.socket.connected;
    }
    
    public disconnect() {
        this.socket && this.socket.disconnect();
    }

    public async connect(user : User, options : WebsocketOptions) {
        if(this.socket) {
            return;
        }
        let ip = '';
        try {
            const {data} = await axios.get('https://checkip.amazonaws.com');
            ip = data != null ? data.toString().trim() : '';
        } catch (e) {
            console.error(e);
        }
        this.socket = io("https://socket.rspeer.org/launcher", {
            extraHeaders: {
                user: user.linkKey,
                launcher: JSON.stringify({
                    host: os.hostname(),
                    platform: os.platform(),
                    identifier : this.identifier,
                    type: os.type(),
                    userInfo: os.userInfo(),
                    ip : ip,
                    linkKey : user.linkKey
                })
            },
            forceNew : true
        });
        this.socket.on('disconnect', () => {
           options.onDisconnect && options.onDisconnect(); 
        });
        this.socket.on('connect', () => {
            options.onConnect && options.onConnect();
        });
        this.socket.on('client_error', (err : any) => {
            options.onError && options.onError(err);
        });
        this.socket.on('launcher_message', (message : any) => {
            message = JSON.parse(message);
            options.onMessage && options.onMessage(message);
        });
    }
}