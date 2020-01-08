function webrtcStreaming(janusUrl, playerId, streamIndex, options) {
  options = options || {};
  webrtcStreaming[playerId] = {}
  webrtcStreaming[playerId].config = {}
  options.debug = options.debug == "true" || options.debug == true ? true : false;
  webrtcStreaming[playerId].config.debug = options.debug;
  webrtcStreaming[playerId].config.width = options.width || document.querySelector("#" + playerId).offsetWidth + "px";
  webrtcStreaming[playerId].config.height = options.height || document.querySelector("#" + playerId).offsetHeight + "px";
  webrtcStreaming[playerId].config.bitrate = options.bitrate || false;
  webrtcStreaming[playerId].config.streamIndex = streamIndex;
  
  html = "<div id='loader' class='lds-ring hide'><div></div><div></div><div></div><div></div></div>"
    + "<div class='message status'></div>"
    + "<div class='message error hide'></div>"
    + "<video class='hide' width='" + webrtcStreaming[playerId].config.width + "' height='" + webrtcStreaming[playerId].config.height + "' autoplay playsinline muted/>";
  document.querySelector("#" + playerId).innerHTML = html;
  webrtcStreaming.playerInfo(playerId, "Initializing connection, please wait...");

  // Initialize the library
  Janus.init({
    debug: webrtcStreaming[playerId].config.debug, 
    callback: function() {
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        Janus.log("webrtcStreaming: No WebRTC support...");
        webrtcStreaming.playerInfo(playerId, "WebRTC is not supported in this browser", true);
        return;
      }
      // Create session
      webrtcStreaming[playerId].janus = new Janus({
        server: janusUrl,
        success: function() {
          webrtcStreaming.streaming(playerId)
        },
        error: function(error) {
          Janus.error("webrtcStreamingJanusError : ", error);
          webrtcStreaming.playerInfo(playerId, "Error while connecting to Janus server", true);
        },
      });
    },
    error: function(error) {
      Janus.log("webrtcStreamingError : ", error);
    },
    destroyed: function() {
      Janus.log("webrtcStreamingDestroyed")
    }
  });
}

webrtcStreaming.streaming = function(playerId) {
  // Attach to streaming plugin
  webrtcStreaming[playerId].janus.attach({
    plugin: "janus.plugin.streaming",
    opaqueId: "streamingtest-" + Janus.randomString(12),
    success: function(pluginHandle) {
      Janus.log("webrtcStreamingAttachSuccess : ", pluginHandle);
      webrtcStreaming[playerId].stream = pluginHandle;
      webrtcStreaming[playerId].stream.send({
        "message": { 
          "request": "watch", 
          "id": parseInt(webrtcStreaming[playerId].config.streamIndex) 
        }
      });
      Janus.log("webrtcStreamingAttachSuccess: Plugin attached! (" + webrtcStreaming[playerId].stream.getPlugin() + ", id=" + webrtcStreaming[playerId].stream.getId() + ")");
    },
    error: function(error) {
      Janus.error("webrtcStreamingAttachError : ", error);
      webrtcStreaming.playerInfo(playerId, "Error while getting to Janus stream", true);
    },
    onmessage: function(msg, jsep) {
      Janus.log("webrtcStreamingAttachOnMessage : ", playerId, msg, jsep);
      var result = msg["result"];
      if(result !== null && result !== undefined) {
        if(result["status"] !== undefined && result["status"] !== null) {
          var status = result["status"];
          if (status === 'starting') {
            webrtcStreaming.playerInfo(playerId, "Connecting to Janus stream, please wait...");
          }
          else if(status === 'started') {
            webrtcStreaming.hideAll(document.querySelectorAll("#" + playerId + " > *"));
            webrtcStreaming.show(document.querySelector("#" + playerId + " video"));
          }
          else if(status === 'stopped') {
            webrtcStreaming.playerInfo(playerId, "Janus stream is stopped, Trying to reconnect...");
            webrtcStreaming.stopStream(playerId);
          }
        }
      } else if(msg["error"] !== undefined && msg["error"] !== null) {
        Janus.error("webrtcStreamingAttachOnMessageError : ", msg["error"]);
        webrtcStreaming.playerInfo(playerId, "Stream is not available", true);
        webrtcStreaming.stopStream(playerId);
        return;
      }
      if(jsep !== undefined && jsep !== null) {
        webrtcStreaming[playerId].stream.createAnswer({
          jsep: jsep,
          media: { audioSend: false, videoSend: false, data: true },
          success: function(jsep) {
            var body = { "request": "start" };
            webrtcStreaming[playerId].stream.send({"message": body, "jsep": jsep});
          },
          error: function(error) {
            Janus.error("webrtcStreamingAttachOnMessageCreateAnswerError : ", error);
          }
        });
      }
    },
    onremotestream: function(stream) {
      Janus.log("webrtcStreamingAttachOnRemoteStream : ", playerId, stream);
      Janus.attachMediaStream(document.querySelector("#" + playerId + " video"), stream);
      var videoTracks = stream.getVideoTracks();
      if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
        webrtcStreaming.playerInfo(playerId, "Waiting for video tracks...");
        webrtcStreaming[playerId].status = "stopped"
        setTimeout(function() {
          if (webrtcStreaming[playerId].status != "playing") {
            webrtcStreaming[playerId].status = "reconnect" 
            webrtcStreaming.reconnect(playerId);
          }
        }, 30000);
      } else {
        webrtcStreaming[playerId].status = "playing"
        webrtcStreaming.hideAll(document.querySelectorAll("#" + playerId + " > *"));
        webrtcStreaming.show(document.querySelector("#" + playerId + " video"));
      }
      if (webrtcStreaming[playerId].config.bitrate) {
        webrtcStreaming[playerId].bitrateTimer = setInterval(function() {
          var bitrate = webrtcStreaming[playerId].stream.getBitrate();
          document.querySelector("#" + playerId + "-" + webrtcStreaming[playerId].config.bitrate).innerHTML = bitrate;
        }, 1000);
      }
    },
  });
}

webrtcStreaming.playerInfo = function(playerId, message, isError = false) {
  webrtcStreaming.hideAll(document.querySelectorAll("#" + playerId + " > *"));
  if (isError) {
    document.querySelector("#" + playerId + " .error").innerHTML = message
    webrtcStreaming.show(document.querySelector("#" + playerId + " .error"));
    return
  }
  if (webrtcStreaming[playerId].config.debug) {
    document.querySelector("#" + playerId + " .status").innerHTML = message
    webrtcStreaming.show(document.querySelector("#" + playerId + " .status"));
  }
  else
  webrtcStreaming.show(document.querySelector("#" + playerId + " #loader"));
}

webrtcStreaming.reconnect = function(playerId) {
  Janus.error("webrtcStreamingReconnect : ", playerId, webrtcStreaming[playerId].config.streamIndex);
  webrtcStreaming.stopStream(playerId);
  webrtcStreaming.streaming(playerId);
}

webrtcStreaming.stopStream = function(playerId) {
	var body = { "request": "stop" };
	webrtcStreaming[playerId].stream.send({"message": body});
  webrtcStreaming[playerId].stream.hangup();
  webrtcStreaming[playerId].status = "stopped";
  clearInterval(webrtcStreaming[playerId].bitrateTimer);
  webrtcStreaming[playerId].bitrateTimer = null;
}

webrtcStreaming.hideAll = function(elements) {
  for (var i = 0; i < elements.length; i++)
  webrtcStreaming.hide(elements[i]);
}

webrtcStreaming.hide = function(element) {
  element.style.display = "none";
}

webrtcStreaming.show = function(element) {
  element.style.display = "block";
}

document.addEventListener("DOMContentLoaded", function(event) {
  var webrtcStreamingPlayers = document.querySelectorAll(".webrtcStreaming");
  for (var i = 0; i < webrtcStreamingPlayers.length; i++) {
    const webrtcStreamingPlayer = webrtcStreamingPlayers[i];
    webrtcStreaming(webrtcStreamingPlayer.getAttribute("src"), webrtcStreamingPlayer.getAttribute("id"), webrtcStreamingPlayer.getAttribute("stream-index"), {
      debug: webrtcStreamingPlayer.getAttribute("debug"),
      width: webrtcStreamingPlayer.getAttribute("width"),
      height: webrtcStreamingPlayer.getAttribute("height"),
      bitrate: webrtcStreamingPlayer.getAttribute("bitrate"),
    });
	}
});