var WebSocketServer = require('ws').Server
var debug = require('debug')('ws-bus')
var util = require('./util')

var defaultOptions = {
  port : 3000,
  debug: false
}

var Server = function(options) {
  if (!options) options = {};
  options = util.merge(defaultOptions, options);
  this.port = options.port;

  if (options.debug)
    this._debug = console.log.bind(console)
  else
    this._debug = function() {};

  this._debug('listening on port:', this.port)
  this.wss = new WebSocketServer({ port: this.port })
  this.listen()
}

Server.prototype.listen = function() {
  var self = this;

  this.wss.on('connection', function(client) {
    client.subscriptions = client.subscriptions || {}
    self._debug('connected client')
    client.on('message', function(data) {
      var message = util.parseMessage(data)
      self.handleIncomingMessage(client, message)
    })
  })
}

Server.prototype.handleIncomingMessage = function(client, message) {
  var isOk = this.validateMessage(message)

  if (!isOk) return

  switch (message.type) {
  case 'subscribe': return this.handleSubscribe(client, message)
  case 'unsubscribe': return this.handleUnsubscribe(client, message)
  case 'message': return this.handleMessage(client, message)
  default: debug('wrong message: %j', message)
  }
}

Server.prototype.handleSubscribe = function(client, message) {
  client.subscriptions = client.subscriptions || {}
  var subs = message.subscriptions

  for (var subscription of subs) {
    client.subscriptions[subscription] = true
  }
}

Server.prototype.handleUnsubscribe = function(client, message) {
  client.subscriptions = client.subscriptions || {}
  var subs = message.subscriptions

  for (var subscription of subs) {
    delete client.subscriptions[subscription]
  }
}

Server.prototype.handleMessage = function(client, message) {
  this.sendMessage(client, message)
}

Server.prototype.sendMessage = function(myClient, message) {
  var data = JSON.stringify(message)
  this.wss.clients.forEach(function each (client) {
    var isSubscribed = client.subscriptions[message.channel]
    if (client !== myClient && isSubscribed) client.send(data)
  })
}

Server.prototype.validateMessage = function(message) {
  // TODO add validation
  // type, subscription, data
  // type [subscribe, unsubscribe, message]
  // subscription - array of
  return true
}

module.exports = Server