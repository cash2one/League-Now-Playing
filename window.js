// useful documentation:
// https://developer.riotgames.com/docs/getting-started


var key = "";






window.onload = function(){
	document.getElementById("saveListButton").onclick = function(){
		saveList();
	};
	document.getElementById("loadListButton").onclick = function(){
		loadList();
	};

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

	// set api key if it is stored
	chrome.storage.local.get("key", function(result) {
		if(result != null && result.key != null)
		{
			key = result.key;
			var spanNode = document.getElementById("apiSpan");
			spanNode.style.display = "none";
		}
	});
	
	
	

};

function debugText(text){
	document.body.appendChild(document.createTextNode(text));
}


// persist the player list to storage, save the IDs.
function saveList(){
	var playerIdList = [];
	var playerNameList = [];
	var playerTableRows = document.getElementById("playerTable").rows;
	for(var i = 1; i < playerTableRows.length; i++) // start at 1 to ignore first row
	{
		playerIdList.push(playerTableRows[i].id);
		playerNameList.push(playerTableRows[i].cells[0].innerHTML);
	}
	chrome.storage.local.set({"playerIds" : playerIdList, "playerNames" : playerNameList});
}

// persist the player list to storage, save the IDs.
function loadList(){
	chrome.storage.local.get(["playerIds", "playerNames"], function(items){
		var idList = items.playerIds;
		var nameList = items.playerNames;
		for(var i = 0; i < idList.length ; i++)
			addPlayerToTable(idList[i], nameList[i]);
	});
}

function setApiKey(){
	var tempKey = document.getElementById("apiKey").value;
	var testRequest = {"command" : "test", "testKey" : tempKey};
	testRequest.callback = function(success) {
		var spanNode = document.getElementById("apiSpan");
		if(success)
		{
			key = tempKey;
			spanNode.style.display = "none";
			chrome.storage.local.set({"key" : key});
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
		if(q1.responseType != "json")
		{
			var target = document.getElementById(pId).cells[2]; // gets the "get match info" cell
			target.innerHTML = "Not currently in game";

			setMatchInfo("");
			return;
		}	
		var obj = JSON.parse(resp);
		var champ = 0;
		var team = 0;
		for(var i=0; i<obj.participants.length; i++)
		{
			if(obj.participants[i].summonerId == pId)
			{
				champ = obj.participants[i].championId;
				team = obj.participants[i].team;
			}
			obj.participants[i].runes = ["omitted"];
			obj.participants[i].masteries = ["omitted"];
		}

		var startTime = obj.gameStartTime;
		var nowTime = (new Date).getTime();
		var length = Math.floor((nowTime-startTime) / 1000); // milliseconds
		if(startTime == 0)
			length = 0;
		var lengthString = Math.floor(length / 60) + ":";
		if(length % 60 < 10)
			lengthString = lengthString + "0";
		lengthString = lengthString + length % 60;

		var q2 = {"command" : "championInfoById", "champId" : champ};
		q2.callback = function(resp){
			var champName = "<>";
			if(resp != null)
				champName = JSON.parse(resp).name;

			var target = document.getElementById(pId).cells[2]; // gets the "get match info" cell
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
		case "getPlayerInfoById":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/" + query.playerId + "?api_key=" + key, function(resp){
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

function addPlayerToTable(id, name){
	if(document.getElementById(id) != null)
		return;
	var tab = document.getElementById("playerTable");
	var row = tab.insertRow();
	row.id = id;

	var nameCell = row.insertCell();
	nameCell.innerHTML = name;

	var idCell = row.insertCell();
	idCell.innerHTML = id;

	var button = row.insertCell();
	button.innerHTML = "Get Match Info";
	button.onclick = function() {
		getMatchInfo(id);
	}
}

function addPlayer(){
	var playerName = document.getElementById("playerName").value;
	while(playerName.indexOf(" ") >= 0)
		playerName = playerName.replace(" ", "");
	playerName = playerName.toLowerCase();
	document.getElementById("playerName").value = "";

	
	var query = {"command" : "getPlayerInfo", "playerName": playerName};
	query.callback = function(resp) {
		if(resp == null || resp == false) // call failed
			return false;

		var obj = JSON.parse(resp)[playerName];

		if(obj == null || obj.id == null) // failed
			return false;
		addPlayerToTable(obj.id, obj.name);
	};

	apiReq(query);

	return false;
}

function addPlayerById(playerId){
	
	var query = {"command" : "getPlayerInfoById", "playerId": playerId};
	query.callback = function(resp) {
		
		if(resp == null || resp == false) // call failed
			return false;

		var obj = JSON.parse(resp)[playerId];

		if(obj == null || obj.name == null) // failed
			return false;
		addPlayerToTable(obj.id, obj.name);
	};

	apiReq(query);

	return false;
}



