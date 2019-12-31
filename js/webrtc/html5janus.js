html5janus.janus = {}
html5janus.streams = {};

function html5janus(janusUrl, playerId, stream_index, options) {
  options = options || {};
  let debug = options.debug || false;
  let width = options.width || $("#" + playerId).innerWidth();
  let height = options.height || $("#" + playerId).innerHeight();
  let loader = options.loader || true;
  $("#" + playerId).append("<div id='loader' class='lds-ring hide'><div></div><div></div><div></div><div></div></div>");
  $("#" + playerId).append("<div class='message status'></div>");
  playerInfo(loader, playerId, "Initializing connection, please wait...");
  $("#" + playerId).append("<div class='message error hide'></div>");
  $("#" + playerId).append("<video class='hide' width='" + width + "' height='" + height + "' autoplay playsinline controls muted/>");
  // Initialize the library
  janusInit = Janus.init({
    debug: debug, 
    callback: function() {
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        Janus.log("html5janus: No WebRTC support... ");
        return;
      }
      // Create session
      html5janus.janus[playerId] = new Janus({
        server: janusUrl,
        success: function() {
          // Attach to streaming plugin
          html5janus.janus[playerId].attach({
            plugin: "janus.plugin.streaming",
            opaqueId: "streamingtest-" + Janus.randomString(12),
            success: function(pluginHandle) {
              Janus.log("html5janusAttachSuccess : ", pluginHandle);
              html5janus.streams[playerId] = pluginHandle;
              html5janus.streams[playerId].send({
                "message": { 
                  "request": "watch", 
                  "id": parseInt(stream_index) 
                }
              });
              Janus.log("html5janusAttachSuccess: Plugin attached! (" + html5janus.streams[playerId].getPlugin() + ", id=" + html5janus.streams[playerId].getId() + ")");
            },
            error: function(error) {
              Janus.error("html5janusAttachError : ", error);
              playerInfo(loader, playerId, "Error while connecting to Janus server", true);
            },
            onmessage: function(msg, jsep) {
              Janus.log("html5janusAttachOnMessage : ", playerId, msg, jsep);
              var result = msg["result"];
              if(result !== null && result !== undefined) {
                if(result["status"] !== undefined && result["status"] !== null) {
                  var status = result["status"];
                  if (status === 'starting') {
                    playerInfo(loader, playerId, "Connecting to Janus, please wait...");
                  }
                  else if(status === 'started') {
                    $("#" + playerId + " > *").hide();
                    // $("#" + playerId + " .status").html("Connected to Janus, rendering the stream...").show();
                    $("#" + playerId + " video").show();
                  }
                  else if(status === 'stopped') {
                    stopStream(); // TODO
                  }
                }
              } else if(msg["error"] !== undefined && msg["error"] !== null) {
                Janus.error("html5janusAttachOnMessageError : ", msg["error"]);
                stopStream(); // TODO
                return;
              }
              if(jsep !== undefined && jsep !== null) {
                html5janus.streams[playerId].createAnswer({
                  jsep: jsep,
                  media: { audioSend: false, videoSend: false, data: true },
                  success: function(jsep) {
                    var body = { "request": "start" };
                    html5janus.streams[playerId].send({"message": body, "jsep": jsep});
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
                playerInfo(loader, playerId, "Waiting for video tracks...");
              } else {
                $("#" + playerId + " > *").hide();
                $("#" + playerId + " video").show();
              }
            },
          });
        },
        error: function(error) {
          Janus.error("html5janusJanusError : ", error);
          playerInfo(loader, playerId, "Error while connecting to Janus server", true);
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

function playerInfo(loader, playerId, message, isError = false) {
  $("#" + playerId + " > *").hide();
  if (isError) {
    $("#" + playerId + " .error").html(message).show();
    return
  }
  if (!loader)
      $("#" + playerId + " .status").html(message).show();
  else
    $("#" + playerId + " #loader").show();
}

$(document).ready(()=>{
  var html5janusPlayers = $(".html5janus");
  for (var i = 0; i < html5janusPlayers.length; i++) {
    const html5janusPlayer = $(html5janusPlayers[i]);
    html5janus(html5janusPlayer.attr("src"), html5janusPlayer.attr("id"), html5janusPlayer.attr("stream_index"), {
      debug: html5janusPlayer.attr("debug"),
      width: html5janusPlayer.attr("width"),
      height: html5janusPlayer.attr("height"),
    });
	}
});