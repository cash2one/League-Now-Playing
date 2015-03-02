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
	var tempKey = document.getElementById("apiKey").value;
	var testRequest = {"command" : "test", "testKey" : tempKey};
	testRequest.callback = function(success) {
		var spanNode = document.getElementById("apiSpan");
		if(success)
		{
			key = tempKey;
			spanNode.style.display = "none";
		}
		else
		{
			if(spanNode.getElementsByTagName("span").length < 1) // if it doesn't exist yet, create it
				spanNode.appendChild(document.createElement("span"));
			spanNode.getElementsByTagName("span")[0].innerHTML = "Invalid API Key";
		}
	}
	apiReq(testRequest);
	
}

function getMatchInfo(pId){
	var q1 = {"command" : "playerCurrentMatchInfo", "playerId" : pId};
	q1.callback = function(resp){
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

		var q2 = {"command" : "championInfoById", "champId" : champ};
		q2.callback = function(resp){
			var champName = "<>";
			if(resp != null)
				champName = JSON.parse(resp).name;

			var target = document.getElementById(pId).getElementsByTagName("td")[2]; // gets the "get match info" cell
			target.innerHTML = lengthString + "<br />" + champName;

			setMatchInfo(JSON.stringify(obj));
			// 
		};
		apiReq(q2);

	};

	apiReq(q1);
}

function setMatchInfo(str){
	document.getElementById("matchInfo").innerHTML= str;
}


function xmlReq(method, url, callback){
	var req = new XMLHttpRequest();
	req.open(method, url);
	req.onload = function() {
		callback(req.response);
	}
	req.send();
}

function apiReq(query) {
	if(query == null)
		return false;
	if(query.region == null)
		query.region = "na";
	if(query["platform"] == null)
		query["platform"] = "NA1";
	switch(query.command)
	{
		case "playerCurrentMatchInfo":
			xmlReq("GET", "https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/" + query["platform"] + "/" + query.playerId + "?api_key=" + key, function(resp){
				query.callback(resp);
			});
		case "championInfoById":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/champion/" + query.champId + "?champData=info&api_key=" + key, function(resp) {
				query.callback(resp);
			});
			break;
		case "getPlayerInfo":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/by-name/" + query.playerName + "?api_key=" + key, function(resp){
				query.callback(resp);
			});
			break;
		case "test":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/RiotSchmick?api_key=" + query.testKey, function(resp){
				var obj = JSON.parse(resp);
				if(obj != null && obj["riotschmick"] != null)
					query.callback(true);
				else
					query.callback(false);
			});
			break;
		default:
			break;
	}
	
}

function addPlayer(){
	var player = document.getElementById("playerName").value;
	player = player.replace(" ", "").toLowerCase();
	document.getElementById("playerName").value = "";

	// https://developer.riotgames.com/docs/getting-started
	var query = {"command" : "getPlayerInfo", "playerName": player};
	query.callback = function(resp) {
		if(resp == null || resp == false) // call failed
			return false;

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
	};

	apiReq(query);

	return false;
}



