const metaTag = document.createElement("meta");
metaTag.name = "viewport";
metaTag.content = "user-scalable=0";
document.getElementsByTagName("head")[0].appendChild(metaTag);

const lastWindow = document.getElementsByClassName("window-group")[0].lastElementChild.id.substring(6);
const active = document.getElementsByClassName("window");


createWindows();

function createWindows() {
    const tileDlg = document.getElementById("tile-dlg");

    document.getElementById("tile-dlg-close").onclick = function () {
        fadeOut(tileDlg);
    };
    dragElement(tileDlg);
}

function dragElement(elmnt) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    if ("ontouchstart" in document.documentElement) {
        var pos1touch = 0,
            pos2touch = 0,
            pos3touch = 0,
            pos4touch = 0;
    }
    if (document.getElementById(elmnt.id + "header")) {
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        document.getElementById(elmnt.id + "header").ontouchstart = dragMouseDown;
    }

    function dragMouseDown(e) {
        if (!"ontouchstart" in document.documentElement) {
            e.preventDefault();
        }
        pos3 = e.clientX;
        pos4 = e.clientY;
        if ("ontouchstart" in document.documentElement) {
            try {
                pos3touch = e.touches[0].clientX;
                pos4touch = e.touches[0].clientY;
            } catch(error) {}
        }
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;
        activeWindow(document.getElementById(elmnt.id));
    }

    function elementDrag(e) {
        e.preventDefault();
        if ("ontouchstart" in document.documentElement) {
            pos1touch = pos3touch - e.touches[0].clientX;
            pos2touch = pos4touch - e.touches[0].clientY;
            pos3touch = e.touches[0].clientX;
            pos4touch = e.touches[0].clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2touch) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1touch) + "px";
        } else {
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

function fadeIn(elmnt) {
    elmnt.style.opacity = 0;
    elmnt.style.display = "initial";
    if (elmnt.classList.contains("fade")) {
        var opacity = 0;
        var timer = setInterval(function () {
            opacity += 30 / 70;
            if (opacity >= 1) {
                clearInterval(timer);
                opacity = 0.9;
            }
            elmnt.style.opacity = opacity;
            activeWindow(elmnt);
        }, 50);
    } else {
        elmnt.style.opacity = "0.9";
        activeWindow(elmnt);
    }
}

function fadeOut(elmnt) {
    if (elmnt.classList.contains("fade")) {
        var opacity = 1;
        var timer = setInterval(function () {
            opacity -= 30 / 70;
            if (opacity <= 0) {
                clearInterval(timer);
                opacity = 0;
                elmnt.style.display = "none";
            }
            elmnt.style.opacity = opacity;
        }, 50);
    } else {
        elmnt.style.display = "none";
        activeWindow(elmnt);
    }
}

function activeWindow(elmnt) {
    for (let i = active.length - 1; i > -1; i--) {
        active[i].classList.remove("window-active");
        elmnt.className += " window-active";
    }
}

function updateTileDlg( map, player, tileID ) {
    if (player) {
        document.getElementById("civs").innerHTML = player.civs[tileID];
        document.getElementById("soldiers").innerHTML = player.soldiers[tileID];
    } else {
        document.getElementById("civs").innerHTML = 0;
        document.getElementById("soldiers").innerHTML = 0;
    }
    document.getElementById("tile-name").innerHTML = map.tileNames[tileID];
    document.getElementById("elevation").innerHTML = map.elevations[tileID];
    setTileDlgTitleColor(map.getOwnerColor(tileID));
}

function setTileDlgTitleColor(color) {
    if(color.r + color.g + color.b > 0) {
        document.getElementById("tile-dlg-title").style.background = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
    } else {
        document.getElementById("tile-dlg-title").style.background = "rgb(14,46,134)"
    }    
}