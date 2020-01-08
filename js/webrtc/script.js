$(document).ready(()=>{

  $.getJSON("webrtc-stream-url.json").done((data) => {
    links = data.links;
    for(i=0;i < links.length; i++) {
      const player_id = `player_${i}`;
      const link = links[i];
      const tags = link.tags.map((tag)=> "<div class='tag'>"+tag+"</div>").join("");
      $("#players").append("\
        <div class='player'>\
          <div id='"+player_id+"' class='webrtcStreaming' style='width:448px; height:252px' hotspot-api='"+links[i]["hotspot_api"]+"'></div>\
          <div class='tags'>"+tags+"<div class='tag' id='"+player_id+"-bitrate'>Bitrate: NA</div>\
          </div>\
        </div>\
      ");
      webrtcStreaming(links[i]["src"], player_id, links[i]["stream_index"], {
        debug: true,
        width: "448px",
        height: "252px",
        bitrate: "bitrate"
      });
      hotspot_api = links[i]["hotspot_api"]
      if (hotspot_api) {
        $("#"+ player_id).next().append("<div class='tag' id='mouseAt'>Mouse at: NA</div>\
          <div class='tag' id='clickedAt'>Clicked at: NA</div>\
          <div class='tag' id='status'>Status: NA</div>");

        setTimeout(function(){
          $("#" + player_id).mousemove(function(event) {
            cordinate = getCordinates(this, event);
            $("#"+ player_id).next().find("#mouseAt").html("Mouse at: X: "+cordinate.x+", Y: "+cordinate.y+"");
          });

          $("#" + player_id).click(function(event) {
            cordinate = getCordinates(this, event);
            $("#" + player_id).next().find("#clickedAt").html("Clicked at: X: "+cordinate.x+", Y: "+cordinate.y+"");
            $.ajax({
              method: "POST",
              url: $("#" + player_id).attr("hotspot-api"),
              crossDomain: true,
              data: JSON.stringify({
                hotspot_detection:
                { cid: "canvas1",
                    id: "detect_hotspot",
                    x: cordinate.x,
                    y: cordinate.y,
                    shift: event.shiftKey
                }}),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
            }).done(function(msg){
                console.info("Success:", msg);
                $("#" + player_id).next().find("#status").html("API: SUCCESS; Action = " + msg.action);
            }).fail(function(jqXHR, textStatus){
                console.info("Error:", jqXHR, textStatus);
                $("#" + player_id).next().find("#status").html("API: ERROR ");
            });
          });
        });
      }
    }

  }).fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ", " + error;
    alert( "Request Failed: " + err );
  });

  function getCordinates(thisObj, event) {
    var offset = $(thisObj).offset();
    x = event.pageX- offset.left;
    y = event.pageY- offset.top;
    return { x: x, y: y }
  }

});