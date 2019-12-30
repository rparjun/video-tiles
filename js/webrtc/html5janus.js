BlipJanus.janus = {}
BlipJanus.streams = {};

function BlipJanus(janusUrl, playerId, stream_index, options) {
  options = options || {};
  let debug = options.debug || false;
  let width = options.width || "480px";
  let height = options.height || "270px";
  $("#" + playerId).append("<div class='message status hide'></div>");
  $("#" + playerId).append("<div class='message error hide'></div>");
  $("#" + playerId).append("<video class='hide' width='" + width + "' height='" + height + "' autoplay playsinline controls muted/>");
  // Initialize the library
  janusInit = Janus.init({
    debug: debug, 
    callback: function() {
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        Janus.log("BlipJanus: No WebRTC support... ");
        return;
      }
      // Create session
      BlipJanus.janus[playerId] = new Janus({
        server: janusUrl,
        success: function() {
          // Attach to streaming plugin
          BlipJanus.janus[playerId].attach({
            plugin: "janus.plugin.streaming",
            opaqueId: "streamingtest-" + Janus.randomString(12),
            success: function(pluginHandle) {
              Janus.log("BlipJanusAttachSuccess : ", pluginHandle);
              BlipJanus.streams[playerId] = pluginHandle;
              BlipJanus.streams[playerId].send({
                "message": { 
                  "request": "watch", 
                  "id": parseInt(stream_index) 
                }
              });
              Janus.log("BlipJanusAttachSuccess: Plugin attached! (" + BlipJanus.streams[playerId].getPlugin() + ", id=" + BlipJanus.streams[playerId].getId() + ")");
            },
            error: function(error) {
              Janus.error("BlipJanusAttachError : ", error);
              $("#" + playerId + " > *").hide();
              $("#" + playerId + " .error").html("Error while connecting to Janus server").show();
            },
            onmessage: function(msg, jsep) {
              Janus.log("BlipJanusAttachOnMessage : ", playerId, msg, jsep);
              var result = msg["result"];
              if(result !== null && result !== undefined) {
                if(result["status"] !== undefined && result["status"] !== null) {
                  var status = result["status"];
                  if (status === 'preparing') {
                    $("#" + playerId + " > *").hide();
                    $("#" + playerId + " .status").html("Initializing connection, please wait...").show();
                  }
                  if (status === 'starting') {
                    $("#" + playerId + " > *").hide();
                    $("#" + playerId + " .status").html("Connecting to Janus, please wait...").show();
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
                Janus.error("BlipJanusAttachOnMessageError : ", msg["error"]);
                stopStream(); // TODO
                return;
              }
              if(jsep !== undefined && jsep !== null) {
                BlipJanus.streams[playerId].createAnswer({
                  jsep: jsep,
                  media: { audioSend: false, videoSend: false, data: true },
                  success: function(jsep) {
                    var body = { "request": "start" };
                    BlipJanus.streams[playerId].send({"message": body, "jsep": jsep});
                  },
                  error: function(error) {
                    Janus.error("BlipJanusAttachOnMessageCreateAnswerError : ", error);
                  }
                });
              }
            },
            onremotestream: function(stream) {
              Janus.log("BlipJanusAttachOnRemoteStream : ", playerId, stream);
              Janus.attachMediaStream($("#" + playerId + " video").get(0), stream);
              var videoTracks = stream.getVideoTracks();
              if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                $("#" + playerId + " > *").hide();
                $("#" + playerId + " .status").html("Waiting for video tracks...").show();
              } else {
                $("#" + playerId + " > *").hide();
                $("#" + playerId + " video").show();
              }
            },
          });
        },
        error: function(error) {
          Janus.error("BlipJanusJanusError : ", error);
          $("#"+playerId+" > *").hide();
          $("#"+playerId+" .error").html("Error while connecting to Janus server").show();
        },
      });
    },
    error: function(error) {
      Janus.log("BlipJanusError : ", error);
    },
    destroyed: function() {
      Janus.log("BlipJanusDestroyed")
    }
  });
}