
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

// swap the row with id=id with the row above it
function moveRowUp(id) {
	var row = document.getElementById(id);
	var name = getNameFromRow(row);
	var startIndex = row.rowIndex;
	if(startIndex == 1) // at top (just under heading)
		return;
	var prevNode = row.previousSibling;
	row.parentNode.insertBefore(row, prevNode);
}

// swap the row with id=id with the row below it
function moveRowDown(id) {
	var row = document.getElementById(id);
	var name = getNameFromRow(row);
	var nextNode = row.nextSibling;
	if(nextNode == null) // at bottom already
		return;
	row.parentNode.insertBefore(row, nextNode.nextSibling); // equivalent of insertAfter(row, nextNode)
	
}

// remove the row from the table
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



function getNameFromRow(row) {
	return row.cells[1].innerHTML;
}

function getMatchInfoCell(row) {
	return row.cells[3];
}

function getSpectateCell(row) {
	return row.cells[4];
}
