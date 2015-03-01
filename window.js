var key = "";




window.onload = function(){
	document.getElementById("setApiKeyButton").onclick = function(){
		setApiKey();
	};
	document.getElementById("apiKey").onkeydown = function(evt){
		if(evt != null && evt.keyCode != null && evt.keyCode == 13)
			setApiKey();
	};

	document.getElementById("addPlayerButton").onclick = function(){
		addPlayer();
	};
	document.getElementById("playerName").onkeydown = function(evt){
		if(evt != null && evt.keyCode != null && evt.keyCode == 13)
			addPlayer();
	};
};



function setApiKey(){
	key = document.getElementById("apiKey").value;
	var spanNode = document.getElementById("apiSpan");
	spanNode.style.display = "none";
}

function getMatchInfo(pId){
	xmlReq("GET", "https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/NA1/" + pId + "?api_key=" + key, function(resp){
		var obj = JSON.parse(resp);
		if(obj == null || obj.gameStartTime == null)
			return;

		var champ = 0;
		for(var i=0; i<obj.participants.length; i++)
		{
			if(obj.participants[i].summonerId == pId)
				champ = obj.participants[i].championId;
		}

		var startTime = obj.gameStartTime;
		var nowTime = (new Date).getTime();
		var length = Math.floor((nowTime-startTime) / 1000); // milliseconds
		var lengthString = Math.floor(length / 60) + ":";
		if(length % 60 < 10)
			lengthString = lengthString + "0";
		lengthString = lengthString + length % 60;


		xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion/" + champ + "?champData=info&api_key=" + key, function(resp) {
			var obj2 = JSON.parse(resp);
			var target = document.getElementById(pId).getElementsByTagName("td")[2]; // gets the "get match info" cell
			target.innerHTML = lengthString + "<br />" + obj2.name;

			// document.getElementById("matchInfo").innerHTML= JSON.stringify(obj) + "<br />" +  JSON.stringify(obj2);
		});


	});
}

function xmlReq(method, url, callback){
	var req = new XMLHttpRequest();
	req.open(method, url);
	req.onload = function() {
		callback(req.response);
	}
	req.send();
}

function addPlayer(){
	var player = document.getElementById("playerName").value;
	player = player.replace(" ", "").toLowerCase();
	document.getElementById("playerName").value = "";

	// https://developer.riotgames.com/docs/getting-started
	xmlReq("GET", "https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/" + player + "?api_key=" + key, function(resp){
		var obj = JSON.parse(resp)[player];

		if(obj == null || obj.id == null) // failed
			return false;

		var row = document.createElement("tr");
		row.id = obj.id;
			var name = document.createElement("td");
			name.innerHTML = obj.name;
			row.appendChild(name);

			var id = document.createElement("td");
			id.innerHTML = obj.id;
			row.appendChild(id);

			var button = document.createElement("td");
			button.innerHTML = "Get Match Info";
			button.onclick = function() {
				getMatchInfo(obj.id);
			}
			row.appendChild(button);

		document.getElementById("playerTable").appendChild(row);
	});

	return false; // makes form not submit so no page reload
}



