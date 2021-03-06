/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var irc = require("irc");
var util = require("util");

// The Server Definition - this opens (and closes) the connection
function IRCServerNode(n) {
    RED.nodes.createNode(this,n);
    this.server = n.server;
    this.channel = n.channel;
    this.nickname = n.nickname;
    this.ircclient = null;
    this.on("close", function() {
        if (this.ircclient != null) {
            this.ircclient.disconnect();
        }
    });
}

RED.nodes.registerType("irc-server",IRCServerNode);

// The Input Node
function IrcInNode(n) {
    RED.nodes.createNode(this,n);
    this.ircserver = n.ircserver;
    this.serverConfig = RED.nodes.getNode(this.ircserver);
    if (this.serverConfig.ircclient == null) {
        this.serverConfig.ircclient = new irc.Client(this.serverConfig.server, this.serverConfig.nickname, {
            channels: [this.serverConfig.channel]
        });
        this.serverConfig.ircclient.addListener('error', function(message) {
            util.log('[irc] '+ JSON.stringify(message));
        });
    }
    this.ircclient = this.serverConfig.ircclient;
    var node = this;

    this.ircclient.addListener('message', function (from, to, message) {
        //util.log(from + ' => ' + to + ': ' + message);
        var msg = { "topic":from, "to":to, "payload":message };
        node.send(msg);
    });

}
RED.nodes.registerType("irc in",IrcInNode);

// The Output Node
function IrcOutNode(n) {
    RED.nodes.createNode(this,n);
    this.sendAll = n.sendObject;
    this.ircserver = n.ircserver;
    this.serverConfig = RED.nodes.getNode(this.ircserver);
    this.channel = this.serverConfig.channel;
    if (this.serverConfig.ircclient == null) {
        this.serverConfig.ircclient = new irc.Client(this.serverConfig.server, this.serverConfig.nickname, {
            channels: [this.serverConfig.channel]
        });
        this.serverConfig.ircclient.addListener('error', function(message) {
            util.log('[irc] '+ JSON.stringify(message));
        });
    }
    this.ircclient = this.serverConfig.ircclient;
    var node = this;

    this.on("input", function(msg) {
        //console.log(msg,node.channel);
        if (msg._topic) { delete msg._topic; }
        if (node.sendAll == "false") {
            node.ircclient.say(node.channel, JSON.stringify(msg));
        }
        else {
            if (typeof msg.payload === "object") { msg.payload = JSON.stringify(msg.payload); }
            if (node.sendAll == "pay") {
                node.ircclient.say(node.channel, msg.payload);
            }
            else {
                var to = msg.topic || node.channel;
                node.ircclient.say(to, msg.payload);
            }
        }
    });
}
RED.nodes.registerType("irc out",IrcOutNode);
