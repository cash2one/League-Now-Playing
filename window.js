var key = "";

var LeagueApi = {

	//calls back with player info if success
	getPlayerInfo: function(playerName, callback) {
		var query = {"command" : "getPlayerInfo", "playerName": playerName};
		apiReq(query, function(resp) {
			if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed
				return false;

			var obj = JSON.parse(resp)[playerName]; // {<playername>:{playerinfo}} is how it is laid out
			if(obj != null)
				callback(obj);
		});
	},

	// calls back with player info if success, otherwise calls back with null
	getPlayerInfoById: function(playerId, callback) {
		var query = {"command" : "getPlayerInfoById", "playerId" : playerId};
		apiReq(query, function(resp) {
			if(resp.charAt(0) == '<' || resp == null || resp == false ) // call failed
				callback(null);
			else
			{
				var obj = JSON.parse(resp);
				if(obj[playerId] != null)
					callback(obj);
				else
					callback(null);
			}
		});
	},

	// rework this so it uses getChampionList
	getChampion: function(champId, callback) {

	},


	champList: {"length":0},
	// populates champList if it is empty, and callsback with it.
	getChampionList: function(callback) {
		var that = this;
		if(this.champList.length != 0)
			callback(this.champList);
		else
		{
			var query = {"command" : "getChampionList"};
			apiReq(query, function (resp) {
				that.champList.length = 0;
				var obj = JSON.parse(resp)["data"];
				for(var key in obj) // for each champion
				{
					that.champList[obj[key].id] = key; // set id to map to champion name
					that.champList.length++;
				}
				callback(that.champList);
			});
		}
	},

	// calls back with match info if player is in game. otherwise calls back with nothing (aka null).
	getCurrentMatch: function(pId, callback) {
		var query = {"command" : "playerCurrentMatchInfo", "playerId" : pId};
		apiReq(query, function(resp){
			if(resp.charAt(0) === '<') // 404 or some error received, usually from not being in game
				callback();
			else
				callback(JSON.parse(resp));
		});
	}
	
}




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


// map platforms to domain
var specGridMap = {"NA1":"spectator.na.lol.riotgames.com:80",
	"EUW1":"spectator.euw1.lol.riotgames.com:80", 
	"EUN1":"spectator.eu.lol.riotgames.com:8080", 
	"KR":"spectator.kr.lol.riotgames.com:80", 
	"OC1":"spectator.oc1.lol.riotgames.com:80", 
	"BR1":"spectator.br.lol.riotgames.com:80", 
	"LA1":"spectator.la1.lol.riotgames.com:80", 
	"LA2":"spectator.la2.lol.riotgames.com:80", 
	"RU":"spectator.ru.lol.riotgames.com:80", 
	"TR1":"spectator.tr.lol.riotgames.com:80", 
	"PBE1":"spectator.pbe1.lol.riotgames.com:8080"
};

// https://developer.riotgames.com/docs/spectating-games
function copySpectatorUrl(matchId, encKey, platform) {
	if(platform == null)
		platform = "NA1";
	var currExe = "\"C:\\Riot Games\\League of Legends\\RADS\\solutions\\lol_game_client_sln\\releases\\0.0.1.79\\deploy\\League of Legends.exe\" ";
	var constParams = "\"8394\" \"LoLLauncher.exe\" \"\" ";
	var lastParam = "\"spectator " + specGridMap[platform] + " " + encKey + " " + matchId + " " + platform + "\"";

	var copyElement = document.createElement("textarea");
	copyElement.textContent = currExe + constParams + lastParam;
	document.body.appendChild(copyElement);
	copyElement.select();
	document.execCommand('copy');
	document.body.removeChild(copyElement);
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
	LeagueApi.getCurrentMatch(pId, function(resp){
		if(resp == null) // from 404 or some error
		{
			LeagueApi.getPlayerInfoById(pId, function(resp) {
				if(resp != null)
				{
					var lastSeen = resp[pId].revisionDate; // ms
					var nowTime = (new Date).getTime(); // ms
					var timeSinceSeen = Math.floor((nowTime - lastSeen) / 1000 / 60); // minutes
					var target = getMatchInfoCell(document.getElementById(pId));
					target.innerHTML = "last seen " + Math.floor(timeSinceSeen / 60 / 24) + "d " + Math.floor((timeSinceSeen / 60) % 24) + "h " + timeSinceSeen % 60 + "m ago";
				}
			});
			emptyMatchInfo();
			return;
		}
		else
		{
			if(resp.participants == null) // then some other error occurred, such as rate limit being exceeded.
				return;
			var champ = 0;
			var team = 0;
			for(var i=0; i<resp.participants.length; i++)
			{
				if(resp.participants[i].summonerId == pId)
				{
					champ = resp.participants[i].championId;
					team = resp.participants[i].team;
				}
				resp.participants[i].runes = ["omitted"];
				resp.participants[i].masteries = ["omitted"];
			}

			LeagueApi.getChampionList(function(champList){
				setMatchInfo(resp, champList);
			});
		}
	});
}

function setStatus(pId, startTime, championName) {
	var nowTime = (new Date).getTime();
	var length = Math.floor((nowTime-startTime) / 1000); // milliseconds
	if(startTime == 0)
		length = 0;
	var lengthString = Math.floor(length / 60) + ":";
	if(length % 60 < 10)
		lengthString = lengthString + "0";
	lengthString = lengthString + length % 60;

	var target = getMatchInfoCell(document.getElementById(pId));
	target.innerHTML = lengthString + "<br />" + championName;
}


function setSpectatorInfo(pId, gameId, encKey, platformId) {
	var spec = getSpectateCell(document.getElementById(pId));
	if(spec.hasChildNodes())
		spec.removeChild(spec.childNodes[0]);
	var specImage = new Image();
	specImage.src = "eye.png";
	specImage.onclick = function(){
		copySpectatorUrl(gameId, encKey, platformId);
	};
	spec.appendChild(specImage);
}

function emptyMatchInfo(){
	document.getElementById("matchInfo").innerHTML= "";
}

function setMatchInfo(match, championList){
	var players = { "blue" : [] , "red" : [] };
	for(var i = 0; i < match.participants.length; i++)
	{
		var player = match.participants[i];
		if(document.getElementById(player.summonerId) != null)
		{
			setStatus(player.summonerId, match.gameStartTime, championList[player.championId]);
			setSpectatorInfo(player.summonerId, match.gameId, match.observers.encryptionKey, match.platformId);
		}

		if(player.teamId >= 200) // >= is for safety. Only ever seen 200 and 100. 200 is red side
			players.red.push({ "name" : player.summonerName, "champ" : championList[player.championId] });
		else
			players.blue.push({ "name" : player.summonerName, "champ" : championList[player.championId] });
	}

	var div = document.getElementById("matchInfo");
	div.innerHTML = "";
	var tab = document.createElement("table")
	tab.style = "width:100%";
	div.appendChild(tab);

	var playerMax = players.blue.length;
	if(players.red.length > playerMax)
		playerMax = players.red.length;

	for(var i = 0; i < playerMax; i++)
	{
		var row = tab.insertRow(i);
		var left = row.insertCell(0);
		var right = row.insertCell(1);
		if(i < players.blue.length)
			left.innerHTML = players.blue[i].name + " playing " + players.blue[i].champ;
		if(i < players.red.length)
			right.innerHTML = players.red[i].name + " playing " + players.red[i].champ;
	}
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
		case "getChampionList":
			xmlReq("GET", "https://global.api.pvp.net/api/lol/static-data/" + query.region + "/v1.2/champion?champData=info&api_key=" + key, function(resp) {
				callback(resp);
			});
			break;
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

function getSpectateCell(row) {
	return row.cells[4];
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

	row.insertCell(); // for spectate button


}

function addPlayer(){
	var playerName = document.getElementById("playerName").value;
	while(playerName.indexOf(" ") >= 0)
		playerName = playerName.replace(" ", "");
	playerName = playerName.toLowerCase();
	document.getElementById("playerName").value = "";

	
	LeagueApi.getPlayerInfo(playerName, function(resp) {
		addPlayerToTable(resp.id, resp.name);
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



