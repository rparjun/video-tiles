function html5janus(janusUrl, playerId, streamIndex, options) {
  options = options || {};
  html5janus[playerId] = {}
  html5janus[playerId].config = {}
  html5janus[playerId].config.debug = options.debug || false;
  html5janus[playerId].config.width = options.width || $("#" + playerId).innerWidth();
  html5janus[playerId].config.height = options.height || $("#" + playerId).innerHeight();
  html5janus[playerId].config.bitrate = options.bitrate || false;
  html5janus[playerId].config.streamIndex = streamIndex;
  // $("#" + playerId).append("");
  $("#" + playerId).append("<div id='loader' class='lds-ring hide'><div></div><div></div><div></div><div></div></div>");
  $("#" + playerId).append("<div class='message status'></div>");
  playerInfo(playerId, "Initializing connection, please wait...");
  $("#" + playerId).append("<div class='message error hide'></div>");
  $("#" + playerId).append("<video class='hide' width='" + html5janus[playerId].config.width + "' height='" + html5janus[playerId].config.height + "' autoplay playsinline controls muted/>");
  // Initialize the library
  Janus.init({
    debug: html5janus[playerId].config.debug, 
    callback: function() {
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        Janus.log("html5janus: No WebRTC support...");
        playerInfo(playerId, "WebRTC is not supported in this browser", true);
        return;
      }
      // Create session
      html5janus[playerId].janus = new Janus({
        server: janusUrl,
        success: function() {
          streaming(playerId)
        },
        error: function(error) {
          Janus.error("html5janusJanusError : ", error);
          playerInfo(playerId, "Error while connecting to Janus server", true);
        },
      });
    },
    error: function(error) {
      Janus.log("html5janusError : ", error);
    },
    destroyed: function() {
      Janus.log("html5janusDestroyed")
    }
  });
}

function streaming(playerId) {
  // Attach to streaming plugin
  html5janus[playerId].janus.attach({
    plugin: "janus.plugin.streaming",
    opaqueId: "streamingtest-" + Janus.randomString(12),
    success: function(pluginHandle) {
      Janus.log("html5janusAttachSuccess : ", pluginHandle);
      html5janus[playerId].stream = pluginHandle;
      html5janus[playerId].stream.send({
        "message": { 
          "request": "watch", 
          "id": parseInt(html5janus[playerId].config.streamIndex) 
        }
      });
      Janus.log("html5janusAttachSuccess: Plugin attached! (" + html5janus[playerId].stream.getPlugin() + ", id=" + html5janus[playerId].stream.getId() + ")");
    },
    error: function(error) {
      Janus.error("html5janusAttachError : ", error);
      playerInfo(playerId, "Error while getting to Janus stream", true);
    },
    onmessage: function(msg, jsep) {
      Janus.log("html5janusAttachOnMessage : ", playerId, msg, jsep);
      var result = msg["result"];
      if(result !== null && result !== undefined) {
        if(result["status"] !== undefined && result["status"] !== null) {
          var status = result["status"];
          if (status === 'starting') {
            playerInfo(playerId, "Connecting to Janus stream, please wait...");
          }
          else if(status === 'started') {
            $("#" + playerId + " > *").hide();
            $("#" + playerId + " video").show();
          }
          else if(status === 'stopped') {
            playerInfo(playerId, "Janus stream is stopped, Trying to reconnect...");
            stopStream(playerId);
          }
        }
      } else if(msg["error"] !== undefined && msg["error"] !== null) {
        Janus.error("html5janusAttachOnMessageError : ", msg["error"]);
        playerInfo(playerId, "Stream is not available", true);
        stopStream(playerId);
        return;
      }
      if(jsep !== undefined && jsep !== null) {
        html5janus[playerId].stream.createAnswer({
          jsep: jsep,
          media: { audioSend: false, videoSend: false, data: true },
          success: function(jsep) {
            var body = { "request": "start" };
            html5janus[playerId].stream.send({"message": body, "jsep": jsep});
          },
          error: function(error) {
            Janus.error("html5janusAttachOnMessageCreateAnswerError : ", error);
          }
        });
      }
    },
    onremotestream: function(stream) {
      Janus.log("html5janusAttachOnRemoteStream : ", playerId, stream);
      Janus.attachMediaStream($("#" + playerId + " video").get(0), stream);
      var videoTracks = stream.getVideoTracks();
      if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
        playerInfo(playerId, "Waiting for video tracks...");
        html5janus[playerId].status = "stopped"
        setTimeout(function() {
          if (html5janus[playerId].status != "playing") {
            html5janus[playerId].status = "reconnect" 
            reconnect(playerId);
          }
        }, 30000);
      } else {
        html5janus[playerId].status = "playing"
        $("#" + playerId + " > *").hide();
        $("#" + playerId + " video").show();
      }
      if (html5janus[playerId].config.bitrate) {
        html5janus[playerId].bitrateTimer = setInterval(function() {
          // Display updated bitrate, if supported
          var bitrate = html5janus[playerId].stream.getBitrate();
          $("#" + playerId + "-" + html5janus[playerId].config.bitrate).html(bitrate);
        }, 1000);
      }
    },
  });
}

function playerInfo(playerId, message, isError = false) {
  $("#" + playerId + " > *").hide();
  if (isError) {
    $("#" + playerId + " .error").html(message).show();
    return
  }
  if (!html5janus[playerId].config.debug)
      $("#" + playerId + " .status").html(message).show();
  else
    $("#" + playerId + " #loader").show();
}

function reconnect(playerId) {
  Janus.error("html5janusReconnect : ", playerId, html5janus[playerId].config.streamIndex);
  stopStream(playerId);
  streaming(playerId);
}

function stopStream(playerId) {
	var body = { "request": "stop" };
	html5janus[playerId].stream.send({"message": body});
  html5janus[playerId].stream.hangup();
  html5janus[playerId].status = "stopped";
}

$(document).ready(()=>{
  var html5janusPlayers = $(".html5janus");
  for (var i = 0; i < html5janusPlayers.length; i++) {
    const html5janusPlayer = $(html5janusPlayers[i]);
    html5janus(html5janusPlayer.attr("src"), html5janusPlayer.attr("id"), html5janusPlayer.attr("streamIndex"), {
      debug: html5janusPlayer.attr("debug"),
      width: html5janusPlayer.attr("width"),
      height: html5janusPlayer.attr("height"),
      bitrate: html5janusPlayer.attr("bitrate"),
    });
	}
});