
// drag and drop handlers
// http://www.html5rocks.com/en/tutorials/dnd/basics/
// https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
function handleDragStart(e) {
	this.style.opacity = '.5';

	dragSrcEl = this;

	e.dataTransfer.effectAllowed = 'move';
	e.dataTransfer.setData('text/html', this.id)
	return false;
}

function handleDragEnter(e) {
	this.classList.add("draggedOver");
}

function handleDragLeave(e) {
	this.classList.remove("draggedOver");
}

function handleDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	return false;
}

function handleDragEnd(e) {
	this.style.opacity = '1';
	return false;
}

function handleDrop(e) {
	e.preventDefault();
	this.classList.remove('draggedOver');
	var self = this;
	var other = document.getElementById(e.dataTransfer.getData('text/html'));
	var parent = self.parentNode;
	if(parent != other.parentNode && self != other)
	{
		return;
	}
	var selfNext = self.nextSibling;
	var otherNext = other.nextSibling;
	parent.insertBefore(self, otherNext);
	parent.insertBefore(other, selfNext);

	return false;
}