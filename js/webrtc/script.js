$(document).ready(()=>{

  $.getJSON("webrtc-stream-url.json").done((data) => {
    links = data.links;
    for(i=0;i < links.length; i++) {
      const player_id = `player_${i}`;
      const link = links[i];
      const tags = link.tags.map((tag)=> "<div class='tag'>"+tag+"</div>").join("");
      $("#players").append("\
        <div class='player'>\
          <div id='"+player_id+"' class='html5janus' style='width:448px; height:252px'></div>\
          <div class='tags'>"+tags+"</div>\
        </div>\
      ");
      html5janus(links[i]["src"], player_id, links[i]["stream_index"], {
        debug: true,
        width: "448px",
        height: "252px",
      });
    }

  }).fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ", " + error;
    alert( "Request Failed: " + err );
  });

});