import socket from "./socket"

var Relay = function(channelName, peer_type){
  this.channel = socket.channel(channelName, {})
  this.inProgress = false;
  this.peer_type = peer_type;
  this.debug = true;
  this.broadcaster_id;
  this.onCallEnded;
  this.onCallStarted;
  this.onCallFailed;
  var that = this;
  this.peerConnectionConfig = null;
  
  this.set_broadcaster_id = function(new_id){
    this.broadcaster_id = new_id;
  }

  
  this.channel.join()
      .receive("ok", () => { that.log("Successfully joined relay channel: " + channelName) })
      .receive("error", () => { that.log("Unable to join relay channel: " + channelName) })

  this.channel.on("message", payload => {
    let message = JSON.parse(payload.body);
    if(message.candidate){
      this.gotRemoteIceCandidate(message);
    }
    else if(message.callEnded && "client" == this.peer_type){
      this.onCallEnded();
    }
    else if(!this.inProgress){
      if (message.request_participation && "server" == this.peer_type){
	this.call();
      }
      else if (message.sdp && "offer" == message.sdp.type && "client" == this.peer_type) {
	that.log("Received offer, answering.....");
	this.createAnswer(message);
      }
      else if(message.sdp && "answer" == message.sdp.type && "server" == this.peer_type){
	that.log("Received answer from client");
	this.setRemoteDescription(message);
      }
      else{
	that.log("Unknown / unused message");
      }
    }else{
      that.log("Call In Progress, ignoring message");
    }
  });


  this.createAnswer = function(message){
    this.setRemoteDescription(message);
    this.peerConnection.createAnswer().then(this.sendAnswer, this.handleError);
    that.log("Received offer and answered, call in progress.....");
    this.inProgress = true;
  }

  this.log = function(message){
    if(this.debug){
      console.log(message);
    }
  };
  
  this.gotLocalIceCandidate = function(event) {
    if (event.candidate) {
      that.channel.push("message", {body: JSON.stringify({
	"candidate": event.candidate
      })});
    }
  }

  this.gotRemoteIceCandidate = function(event) {
    if (event.candidate) {
      this.peerConnection.addIceCandidate(
	new RTCIceCandidate(event.candidate)
      ).then(
	function(){
	  that.log("Found ICE candidate, added");
	},
	this.handleError
      );
    }
  }

  this.sendAnswer = function(description){
    that.peerConnection.setLocalDescription(description, () => {
      that.channel.push("message", { body: JSON.stringify({
	  "sdp": that.peerConnection.localDescription
      })});
    }, that.handleError);
  }

  this.sendOffer = function(description){
    that.peerConnection.setLocalDescription(description, () => {
      that.channel.push("message", { body: JSON.stringify({
	"sdp": that.peerConnection.localDescription
      })});
    }, that.handleError);
  }

  this.setRemoteDescription = function(description){
    this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description.sdp),
      function(){	
	that.log("Remote description set");
      },
      that.handleError);
  }

  this.handleError = function(error) {
    console.error("Error from handleError: " + error.name + ": " + error.message);
  }

  this.hangup = function() {
    that.log("Ending call");
    if(this.peerConnection) this.peerConnection.close();
    if(this.peer_type == "server"){
      this.stream.getTracks().forEach(function(track) { track.stop() })
    }
    this.inProgress = false;
  }

  this.onSignalingStateChange = function(){
    that.log("Signaling state changed to: " + that.peerConnection.signalingState);
  };

  this.onRemoveStream = function(){
    that.log("Stream removed from peer connection");
  };

  this.onConnectionStateChange = function(evt){
    that.log("Connection state change detected: " + that.peerConnection.connectionState);
  };

  this.onIceConnectionStateChange = function(evt){
    var iceConnectionState = that.peerConnection.iceConnectionState;
    that.log("ICE connection state change: " + iceConnectionState);
    if("client" == that.peer_type){
      if("connected" == iceConnectionState){
	that.onCallStarted();
      }else if("failed" == iceConnectionState){
	that.onCallFailed();
      }else if("closed" == iceConnectionState){
	that.onCallEnded();
      }
    }
  };

  this.onIceGatheringStateChange = function(evt){
    that.log("ICE Gathering state change: " + that.peerConnection.iceGatheringState);
  };

  this.onIdentityResult = function(){
    that.log("onidentityresult event detected!");
  };

  this.onIdpAssertionError = function(){
    console.error("onidpassertionerror event detected!");
  };

  this.onIdpValidationError = function(){
    console.error("onidpvalidationerror event detected!");
  };

  this.onNegotiationNeeded = function(){
    that.log("Negotiation needed again, onNegotiationNeeded event raised.");
  };

  this.onPeerIdentity = function(){
    that.log("onPeerIdentity event detected.");
  };
  
};

Relay.prototype.request_participation = function(broadcaster_id){
  this.log("Requesting participation");
  this.channel.push("message", { body: JSON.stringify({
    "request_participation": true,
    "broadcaster_id": broadcaster_id
  })});
};

Relay.prototype.fetch_resources_and_get_stream = function(user_media_request, do_something_with_stream){
  var that = this;
  navigator.mediaDevices.getUserMedia(user_media_request)
	   .then(gotStream)
	   .catch(function(error){
	     console.error("Fetching resources getUserMedia error: ", error);
	   });

  function gotStream(stream) {
    that.stream = stream;
    do_something_with_stream(stream);
  }
};

Relay.prototype.setupPeerConnection = function() {
  this.peerConnection = new RTCPeerConnection(this.peerConnectionConfig);
  this.peerConnection.onicecandidate = this.gotLocalIceCandidate;
  this.peerConnection.ontrack = this.gotRemoteStream;
  this.peerConnection.onsignalingstatechange = this.onSignalingStateChange;
  this.peerConnection.onconnectionstatechange = this.onConnectionStateChange;
  this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange;
  this.peerConnection.onicegatheringstatechange = this.onIceGatheringStateChange;
  this.peerConnection.onidentityresult = this.onIdentityResult;
  this.peerConnection.onidpassertionerror = this.onIdpAssertionError;
  this.peerConnection.onremovestream = this.onRemoveStream;
  this.peerConnection.onidpvalidationerror = this.onIdpValidationError;
  this.peerConnection.onnegotiationneeded = this.onNegotiationNeeded;
  this.peerConnection.onpeeridentity = this.onPeerIdentity;
  this.log("Created local peer connection");
};

Relay.prototype.add_local_stream_to_peer_connection = function(){
  const audioTracks = this.stream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  this.stream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.stream))
  
  this.log("Added localStream to localPeerConnection");
};

Relay.prototype.call = function() {
  this.setupPeerConnection();
  this.add_local_stream_to_peer_connection();
  this.log("Starting call");
  var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0
  };
  this.peerConnection.createOffer(offerOptions)
      .then(this.sendOffer,
	    this.handleError);
  this.log("Offer created from server and sdp sent");
};

export default Relay
