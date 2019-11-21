
function getType(url){
  if (url.indexOf(".m3u8") > 0) {
    return "application/x-mpegURL"
  }
  else if (url.indexOf("rtmp://") >= 0) {
    return "rtmp/mp4";
  }
  else if (url.indexOf(".mp4") > 0) {
    return "video/mp4"
  }
  else {
    alert("unknown video type: '"+url+"'");
  }
}

$(document).ready(()=>{

  $.getJSON("stream-url.json").done((data) => {
    console.log("links", data.links)

    links = data.links;
      let players = [];

      for(i=0;i < links.length; i++) {
        const player_id = `player_${i}`;
        const link = links[i];
        const tags = link.tags.map((tag)=> "<div class='tag'>"+tag+"</div>").join("");
        $("#players").append("\
          <div class='player'>\
            <video autoplay='true' muted='muted' id='"+player_id+"' class='video-js vjs-default-skin' controls preload='auto' width='448' height='252'></video>\
            <div class='tags'>"+tags+"</div>\
          </div>\
        ");

        const player = videojs(player_id, {
          autoplay: true,
          sources:[{
            src: link.src,
            type: getType(link.src)
          }]
        });
        players.push(player);
      }

  }).fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ", " + error;
    alert( "Request Failed: " + err );
  });

});
