var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , path = require('path')
  , BTSP = require('bluetooth-serial-port')
  , BTserial = new BTSP.BluetoothSerialPort()
  , fs = require('fs')
  , BTDevices = [];
var bodyParser = require('body-parser');


var jsonRes = "";

server.listen(80);
app.use(express.static(__dirname));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

io.sockets.on('connection', function (socket) {

	socket.on('search_Bluetooth', function(data){
    	if (data == "new") {
    		BTserial.close();
    		console.log("search for Bluetooth Device")
    		BTserial.inquire();
    	} else {
    		console.log("return list of Bluetooth Devices");
    		for (var i = 0; i < BTDevices.length; i++) {
    			socket.emit('device',{address: TDevices[i].address, name: TDevices[i].name, channel: TDevices[i].channel});
    		}
    	}
    });

    BTserial.on('found', function(address, name) {
    	BTserial.findSerialPortChannel(address, function(channel) {
    		socket.emit('device',{address: address, name: name, channel: channel});
    		BTDevices.push({address: address, name: name, channel: channel});
    	});
    });

    BTserial.on('failure',function(err){
		console.log('failure: '+ err)
	});

	BTserial.on('finished',function(){
		console.log('finished searching')
		socket.emit('search_Bluetooth_stopped',{});

	})

    socket.on('open_Bluetooth_Connection',function(address){
    	for (var i = 0; i < BTDevices.length; i++) {
    		var channel;
    		if (BTDevices[i].address === address) {
    			channel = BTDevices[i].channel;
    		};
    	};
		BTserial.connect(address, channel, function() {
			socket.emit('connected_Bluetooth',{address:address});
		},function (){
			console.log('Cannot connect');
		});
    });

    socket.on('close_Bluetooth_Connection', function(){
    	BTserial.close();
    });

    socket.on('send_To_Bluetooth', function(data){
    	var buffer = new Buffer(data, 'utf8')
    	BTserial.write(buffer, function (err, bytesWritten){
            	if (err) {
            		console.log(err);
            	}
            	if (bytesWritten == buffer.length) {
            		console.log('All bytes are send');
            	}
            });
    })

    var dataBuffer = "";
    BTserial.on('data', function(buffer) {
      var res = "";

    	dataBuffer = dataBuffer + buffer.toString('utf8');

      //regex to extract last json object sent from bt shield
      res = dataBuffer.match('{(?!.*{).*}');
      console.log("resultat: "+ res);
      //parse json object
      jsonRes = JSON.parse(res);
      //send data to client
      socket.emit('informations', res);

      app.get('/infosJson', function (request, response) {
          response.json({jsonRes});
      });

      app.get('/infos', function (request, response) {
        response.render(__dirname + '/views/infos', {
                temp: jsonRes.Temperature,
                hum: jsonRes.Humidity,
                dust: jsonRes.Dust
        });
      });
	});
});
