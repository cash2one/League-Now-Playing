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
	// document.body.appendChild(document.createTextNode(text));
	console.log(text);
}



// https://developer.riotgames.com/docs/spectating-games
function copySpectatorUrl(matchId, encKey, platform) {

	var copyElement = document.createElement("textarea");
	copyElement.textContent = LeagueApi.generateSpectatorString(matchId, encKey, platform);
	document.body.appendChild(copyElement);
	copyElement.select();
	document.execCommand('copy');
	document.body.removeChild(copyElement);
}

// TODO1:
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

			LeagueApi.getChampionList(function (champList) {
				LeagueApi.getSpellList(function (spellNames, spellKeys){
					setMatchInfo(resp, champList, spellKeys);
				});
			});
		}
	});
}


var popupArray = [];
function getHistory(pId){
	LeagueApi.getRecentMatches(pId, function(resp){
		LeagueApi.getChampionList(function(championList){
			LeagueApi.getItemList(function(itemList){
				LeagueApi.getSpellList(function(spellList){
					if(resp == null) // from 404 or some error
						return;

					var parent = document.getElementById(pId);

					for(var i = 0; i < resp.length; i++)
					{
						if(resp[i].fellowPlayers != null) // if solo in custom, no fellow players exist
						{
							for(var j = 0; j < resp[i].fellowPlayers.length; j++)
							{
								var player = resp[i].fellowPlayers[j];
								var row = document.getElementById(player.summonerId);
								if(row != null)
									player.name = getNameFromRow(row);
								player.championId = championList[player.championId];
							}
							if(resp[i].teamId == 100) // show same team as player first
								resp[i].fellowPlayers.sort(function(a, b) {
									var af = a.teamId;
									var bf = b.teamId;
									if(a.name != null)
										af -= 50;
									if(b.name != null)
										bf -= 50;
									return af - bf;
								});
							else
								resp[i].fellowPlayers.sort(function(b, a) {
									var af = a.teamId;
									var bf = b.teamId;
									if(a.name != null)
										af += 50;
									if(b.name != null)
										bf += 50;
									return af - bf;
								});
						}
						for(var j = 0; j < 7; j++)
						{
							if(resp[i].stats["item" + j] != null)
								resp[i].stats["item" + j] = itemList[resp[i].stats["item" + j]].name;
						}
						resp[i].championId = championList[resp[i].championId];
						resp[i].mapId = LeagueApi.getMap(resp[i].mapId);
						resp[i]["spell1"] = spellList[resp[i]["spell1"]];
						resp[i]["spell2"] = spellList[resp[i]["spell2"]];
					}


					
					for(var i = 0; i < resp.length; i++)
					{
						if(popupArray[i] != null) // if popup already displayed
							popupArray[i].parentNode.removeChild(popupArray[i]);

						var matchDiv = document.createElement("div");
						parent.appendChild(matchDiv);
						popupArray[i] = matchDiv;

						var buttons = document.createElement("div");
						matchDiv.appendChild(buttons);
							var prevB = document.createElement("button");
							// prevB.type = "button";
							prevB.data = i;
							prevB.innerHTML = "prev";
							if(i > 0)
								prevB.onclick = function() {
									popupArray[this.data].style.display = "none";
									popupArray[this.data-1].style.display = "inherit";
							};
							buttons.appendChild(prevB);
							var nextB = document.createElement("button");
							// nextB.type = "button";
							nextB.data = i;
							nextB.innerHTML = "next";
							if(i + 1 < resp.length)
								nextB.onclick = function() {
									popupArray[this.data].style.display = "none";
									popupArray[this.data+1].style.display = "inherit";
							};
							buttons.appendChild(nextB);
							var closeB = document.createElement("button");
							// closeB.type = "button";
							closeB.innerHTML = "close";
							closeB.onclick = function() {
								for(var i = 0; i < popupArray.length; i++)
								{
									popupArray[i].parentNode.removeChild(popupArray[i]);
									popupArray[i] = null;
								}
							};
							buttons.appendChild(closeB);

						var matchDivStr = document.createElement("pre");
						matchDivStr.innerHTML = JSON.stringify(resp[i], null, "\t");
						matchDiv.appendChild(matchDivStr);

						matchDiv.style.position = "absolute";
						matchDiv.style.display = "none";
						matchDiv.style.top = parent.offsetTop + 2*parent.offsetHeight;
						matchDiv.style.left = parent.offsetLeft + (parent.offsetWidth * 0.30);
						matchDiv.style.width = parent.offsetWidth * .7;
						matchDiv.style.border = "3px solid black";
						matchDiv.style.backgroundColor = "lightgray";

					}

					popupArray[0].style.display = "inherit";
				});
			});
		});
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
// fill the matchInfo div with a table that describes the match.
function setMatchInfo(match, championList, spellKeyList){
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
			players.red.push({ "name" : player.summonerName, "champ" : championList[player.championId], "spell1" : spellKeyList[player.spell1Id], "spell2" : spellKeyList[player.spell2Id] });
		else
			players.blue.push({ "name" : player.summonerName, "champ" : championList[player.championId], "spell1" : spellKeyList[player.spell1Id], "spell2" : spellKeyList[player.spell2Id] });
	}

	var div = document.getElementById("matchInfo");
	emptyMatchInfo();
	var matchDescription = document.createElement("span");
	matchDescription.innerHTML = match.gameType + " of " + match.gameMode + " on " + LeagueApi.getMap(match.mapId);
	div.appendChild(matchDescription);
	div.appendChild(document.createElement("br"));
	var tab = document.createElement("table")
	tab.style = "width:100%";
	tab.id = "matchInfoTable";
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
			populatePlayerCell(left, players.blue[i], "right");
		if(i < players.red.length)
			populatePlayerCell(right, players.red[i], "left");
	}
}
function populatePlayerCell(cell, player, float) {
	var span = document.createElement("span");
	cell.appendChild(span);
	span.innerHTML = player.name;
	var champImg = new Image();
	cell.appendChild(champImg);
	champImg.setAttribute("class", "champ");
	champImg.style.float = float;

	var spelldiv = document.createElement("div");
	cell.appendChild(spelldiv);
	spelldiv.style.float = float;
	var spell1 = new Image();
	spelldiv.appendChild(spell1);
	spell1.setAttribute("class", "spell1");
	var spell2 = new Image();
	spelldiv.appendChild(spell2);
	spell2.setAttribute("class", "spell2");

	setSpellIcon(cell, "spell1", player.spell1);
	setSpellIcon(cell, "spell2", player.spell2);
	setChampionIcon(cell, "champ", player.champ);

}
// puts the <champion>'s icon in <cell>'s child that has <className> className
function setChampionIcon(cell, className, champion) {
	xmlReqAsBlob("GET", LeagueApi.getChampPortraitUrl(champion), function(result) {
		cell.getElementsByClassName(className)[0].src = window.URL.createObjectURL(result);
	});
}
// puts the <spellId>'s icon in <cell>'s child that has <className> className
function setSpellIcon(cell, className, spellId) {
	xmlReqAsBlob("GET", LeagueApi.getSpellPortraitUrl(spellId), function(result) {
		cell.getElementsByClassName(className)[0].src = window.URL.createObjectURL(result);
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

function xmlReqAsBlob(method, url, callback){
	var req = new XMLHttpRequest();
	req.open(method, url);
	req.responseType = 'blob';
	req.onload = function() {
		callback(req.response);
	}
	req.send();
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



