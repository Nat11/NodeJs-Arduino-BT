var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , BTSP = require('bluetooth-serial-port')
  , BTserial = new BTSP.BluetoothSerialPort()
  , fs = require('fs')
  , BTDevices = [];
var bodyParser = require('body-parser');


var jsonRes;

const appServer = server.listen(process.env.PORT || 3000, () => {
    const port = appServer.address().port;
    console.log(`App listening on port ${port}`);
});


//server.listen(3000);
app.use(express.static(__dirname));




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
      console.log("databuffer: "+dataBuffer);

      res = dataBuffer.match('{(?!.*{).*}');
      console.log("resultat: "+res);



        jsonRes = JSON.parse(res);
        console.log("temperature: "+jsonRes);
        socket.emit('informations',res);
        app.get('/temp', function (request, response) {
            response.json({jsonRes});
        });






	});
});
