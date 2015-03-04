// useful documentation:
// riot api
// https://developer.riotgames.com/api/methods
// chrome apis
// https://developer.chrome.com/apps/api_index
// https://developer.chrome.com/apps/storage
// 
// JS xmlHTTPRequest, DOM
// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model
// strings: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String 

var key = "";






window.onload = function(){
	document.getElementById("saveListButton").onclick = saveList;
	document.getElementById("loadListButton").onclick = loadList;
	document.getElementById("setApiKeyButton").onclick = setApiKey;

	document.getElementById("apiKey").onkeydown = function(evt){
		if(evt != null && evt.keyCode != null && evt.keyCode == 13)
			setApiKey();
	};


	document.getElementById("addPlayerButton").onclick = addPlayer;

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
		playerNameList.push(getNameFromRow(playerTableRows[i]));
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
	apiReq(testRequest, function(success) {
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
	});
}

function getMatchInfo(pId){
	var q1 = {"command" : "playerCurrentMatchInfo", "playerId" : pId};
	apiReq(q1, function(resp){
		// debugText(resp);
		if(resp.charAt(0) === '<') // 404 or some error received, usually from not being in game
		{
			var q2 = {"command" : "getPlayerInfoById", "playerId" : pId};
			apiReq(q2, function(resp2) {
				var lastSeen = JSON.parse(resp2)[pId].revisionDate; // ms
				var nowTime = (new Date).getTime(); // ms
				var timeSinceSeen = Math.floor((nowTime - lastSeen) / 1000 / 60); // minutes
				var target = getMatchInfoCell(document.getElementById(pId));
				target.innerHTML = "last seen " + Math.floor(timeSinceSeen / 60 / 24) + "d " + Math.floor(timeSinceSeen / 60) + "h " + timeSinceSeen % 60 + "m ago";
			});
			setMatchInfo("");
			return;
		}
		else
		{
			var obj = JSON.parse(resp);
			if(obj.participants == null) // then some other error occurred, such as rate limit being exceeded.
				return;
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
			apiReq(q2, function(resp2){
				var champName = "<>";
				if(resp2 != null)
					champName = JSON.parse(resp2).name;

				var target = getMatchInfoCell(document.getElementById(pId));
				target.innerHTML = lengthString + "<br />" + champName;

				setMatchInfo(JSON.stringify(obj));
				// 
			});
		}
	});
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

function apiReq(query, callback) {
	if(callback == null && query.callback != null)
		callback = query.callback(); // callback can be set in query object or in this function call.
	else if(callback == null && query.callback == null)
		callback = function(resp) {return;}; // do nothing if no callback

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
				callback(resp);
			});
			break;
		case "championInfoById":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/champion/" + query.champId + "?champData=info&api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
		case "getPlayerInfo":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/by-name/" + query.playerName + "?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "getPlayerInfoById":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/" + query.region + "/v1.4/summoner/" + query.playerId + "?api_key=" + key, function(resp){
				callback(resp);
			});
			break;
		case "test":
			xmlReq("GET", "https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/RiotSchmick?api_key=" + query.testKey, function(resp){
				var obj = JSON.parse(resp);
				if(obj != null && obj["riotschmick"] != null)
					callback(true);
				else
					callback(false);
			});
			break;
		default:
			break;
	}
	
}

function getNameFromRow(row) {
	return row.cells[1].innerHTML;
}

function getMatchInfoCell(row) {
	return row.cells[3];
}

function moveRowUp(id) {
	var row = document.getElementById(id);
	var name = getNameFromRow(row);
	var startIndex = row.rowIndex;
	if(startIndex == 1) // at top (just under heading)
		return;
	var prevNode = row.previousSibling;
	row.parentNode.insertBefore(row, prevNode);
}

function moveRowDown(id) {
	var row = document.getElementById(id);
	var name = getNameFromRow(row);
	var nextNode = row.nextSibling;
	if(nextNode == null) // at bottom already
		return;
	row.parentNode.insertBefore(row, nextNode.nextSibling); // equivalent of insertAfter(row, nextNode)
	
}

function removeRow(id) {
	var row = document.getElementById(id);
	row.parentNode.removeChild(row);
}

function addPlayerToTable(id, name, index){
	if(document.getElementById(id) != null)
		return;
	var tab = document.getElementById("playerTable");

	if(index == null)
		index = -1;
	if(index > tab.rows.length) // would fail by being over limit
		index = tab.rows.length; // set to last element
	var row = tab.insertRow(index);
	row.id = id;

	var moveCell = row.insertCell();
		var up = new Image();
		up.src = 'upArrow.png';
		up.alt = 'Move Row Up';
		up.onclick = function() {moveRowUp(id);};
		

		var down = new Image();
		down.src = 'downArrow.png';
		down.alt = 'Move Row Down';
		down.onclick = function() {moveRowDown(id);};
		
		var remove = new Image();
		remove.src = 'x.png';
		remove.alt = 'Remove Row';
		remove.onclick = function() {removeRow(id);};

		moveCell.appendChild(up);
		moveCell.appendChild(down);
		moveCell.appendChild(remove);

	var nameCell = row.insertCell();
	nameCell.innerHTML = name;

	var idCell = row.insertCell();
	idCell.innerHTML = id;

	var infoButton = row.insertCell();
	infoButton.innerHTML = "Get Match Info";
	infoButton.onclick = function() {
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
	apiReq(query, function(resp) {
		
		if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed
			return false;
		

		var obj = JSON.parse(resp)[playerName];

		if(obj == null || obj.id == null) // failed
			return false;
		addPlayerToTable(obj.id, obj.name);
	});

	

	return false;
}

function addPlayerById(playerId){
	
	var query = {"command" : "getPlayerInfoById", "playerId": playerId};

	apiReq(query, function(resp) {
		
		if(resp == null || resp == false) // call failed
			return false;

		var obj = JSON.parse(resp)[playerId];

		if(obj == null || obj.name == null) // failed
			return false;
		addPlayerToTable(obj.id, obj.name);
	});

	return false;
}



