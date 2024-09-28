//* string.autoLink
//* https://github.com/bryanwoods/autolink-js/blob/master/autolink.js
(function(){var k=[].slice;String.prototype.autoLink=function(){var d,b,g,a,e,f,h;e=1<=arguments.length?k.call(arguments,0):[];f=/(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;if(!(0<e.length))return this.replace(f,"$1<a href='$2'>$2</a>");a=e[0];d=a.callback;g=function(){var c;c=[];for(b in a)h=a[b],"callback"!==b&&c.push(" "+b+"='"+h+"'");return c}().join("");return this.replace(f,function(c,b,a){c=("function"===typeof d?d(a):
    void 0)||"<a href='"+a+"'"+g+">"+a+"</a>";return""+b+c})}}).call(this);

var CATEGORIES = []; 
var SHOWGLOBAL = [];
var CATEGORYRULES = [];
var GLOBALRULES = "";
var FIELDSTODISPLAY = ["Place", "Username", "Score", "Date"]; 
var categoryObjs = new Map();
var runs;

var EMBEDWIDTH = "75%";
var EMBEDHEIGHT = "500";

class CategoryObject {
    constructor(btn, div, table) {
        this.btn = btn;
        this.div = div;
        this.table = table;

        // used for keeping track of Place
        this.placeInt = 0;
        // for ties
        this.placeIncrement = 1;
        this.currScore = "";
        this.foundNames = new Set();
    }

    add(run) {
        //only one run displayed per username per category
        if (this.foundNames.has(run.Username.toLowerCase()))
            return;
        this.foundNames.add(run.Username.toLowerCase());

         // figure out this run's place, accounting for ties
        if (run.Score === this.currScore) {
            this.placeIncrement++;
        } else {
            this.placeInt += this.placeIncrement;
            this.placeIncrement = 1;
            this.currScore = run.Score;
        }

        formatRun(run, this.placeInt);

        let tr = this.table.insertRow();
        tr.className = "place" + this.placeInt;

        for (let field of FIELDSTODISPLAY) {
            let td = tr.insertCell();
            if (field == "Score") {
                let f = new Intl.NumberFormat('en-US');
                let n = f.format(run[field]);
                td.textContent = n;
            } else {
                td.textContent = run[field];
            }
        }

        // hover comment
        tr.title = run.Comment;

        //dropdown collapsible content. put it in its own tr/td
        let divtr = this.table.insertRow();
        divtr.className = "divtr";

        let divtd = divtr.insertCell();
        divtd.className = "divtr";
        divtd.colSpan = "999";

        let div = document.createElement('div');
        div.className = "content";
        divtd.appendChild(div);

        tr.onclick = function() {
            if (div.style.maxHeight){
                //slide back up
                div.style.maxHeight = null;
                //we don't want the embeds staying in existence
                div.ontransitionend = function() {
                    div.textContent = "";
                }
            } else {
                //slide it out, fill the div with its text
                createDropdown(div,run);
                div.style.maxHeight = div.scrollHeight + "px";

                //we don't want the newly slid out thing to be off the bottom of the screen
                div.ontransitionend = function() {
                let bottompx = div.getBoundingClientRect().top + div.clientHeight;
                if (bottompx > window.innerHeight)
                    window.scrollBy({
                        top: bottompx-window.innerHeight+25,
                        left: 0,
                        behavior: 'smooth'
                    });
                }
            }
        }
        console.log("run added to category")
    }

    setEnabled(bool) {
        if (bool) {
            this.btn.classList.add("button-selected");
            this.btn.classList.remove("button-unselected");
            this.div.classList.remove("no-display");
        } else {
            this.btn.classList.remove("button-selected");
            this.btn.classList.add("button-unselected");
            this.div.classList.add("no-display");
        }
    }
}

window.onload = function() {
    fetchCats(1);
}

function fetchCats(tries) {
	parseCategories();
	makeTables();
	switchTab(CATEGORIES[0]);
	if (document.location.hash !== "") {
		let hashCat = document.location.hash.split("#")[1].replace(/%20/g," ");
		if (CATEGORIES.indexOf(hashCat) != -1) {
			switchTab(hashCat);
		}
	}
	fetchRuns(1);
}

function fetchRuns(tries) {
	fetchLink = "https://docs.google.com/spreadsheets/d/1pZ5zPPzaZvygFBlPG1Ye72xx8vSDffypoJEm8cD1l3k/gviz/tq?tqx=out:json&tq&#gid=1256879831";
    fetch(fetchLink)
    .then(res => res.text())
    .then(text => {
        const data = JSON.parse(text.substring(47).slice(0, -2));
		runs = parseRuns(data);
        console.log(" runs parsed");

        populateTables(runs);
    }).catch(function(error) {
        console.log("refetching runs");
        if (tries < 10)
            fetchRuns(tries+1);
        else
            document.getElementById("header-div").textContent = "Unable to retrieve the Google Sheets file";
        throw error;
    });
}

function createDropdown(div,run) {
    let link = run["Video link"];
    let embedLink = embedCheck(link);

    if (embedLink !== "") {
        div.innerHTML = '<iframe width="' + EMBEDWIDTH + '" height="' + EMBEDHEIGHT + '" src="' + embedLink + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
        div.innerHTML += '<p class="underembed">(<a href="' + link + '">' + link + '</a>)</p>';
    } else {
        if (link !== "")
            div.innerHTML = '<br><a href="' + link + '">' + link + '</a>';
        else
            div.innerHTML = "<br>No proof";
    }

    // comment
    let p = document.createElement('p');
    p.className = "comment";
    if (run.Comment !== "") {
        p.textContent = "Comment: " + run.Comment;
        console.log(p.textContent);
        p.innerHTML = p.innerHTML.autoLink();
    }
    else {
        p.textContent = "No comment";
    }
    div.appendChild(p);
}

function embedCheck(runLink) {
    //test for youtu.be and youtube.com
    let ytAttempt = runLink.split("youtu.be/");
    if (ytAttempt.length == 1) ytAttempt = runLink.split("watch?v=");
    if (ytAttempt.length > 1) {
        IDandVars = ytAttempt[1].split(/[\?|&]/g);
        finalString = IDandVars[0] + "?";
        for (i = 1; i < IDandVars.length; i++) {
            finalString += IDandVars[i] + "&";
        }
        finalString = finalString.replace(/([\?|&])t=([0-9]+)s/g,"$1start=$2")
        return ("https://www.youtube.com/embed/" + finalString);
    }

    //test for google drive
    ytAttempt = runLink.split("/file/d/");
    if (ytAttempt.length == 1) ytAttempt = runLink.split("open?id=");
    if (ytAttempt.length > 1) {
        ytAttempt = ytAttempt[1].split("/");
        return ("https://drive.google.com/file/d/" + ytAttempt[0] + "/preview");
    }

    return "";
}

function switchTab(category) {
    for (let categoryObj of categoryObjs) {
        categoryObj[1].setEnabled(categoryObj[0] == category);
    }
}

function makeTables() {
    let mainContainer = document.getElementById("main-container");
    let buttonDiv = document.getElementById("button-div");
    for (let category of CATEGORIES) {
        // button
        let btn = document.createElement('button');
        btn.textContent = category;
        btn.onclick = function() {
            switchTab(category);
            window.location.href="#" + category;
        };
        buttonDiv.appendChild(btn);

        // containing div
        let div = document.createElement('div');
        div.className = 'category-div';

        //submit run button
        let submitButton = document.createElement('button');
        submitButton.className = 'submit';
        submitButton.textContent = "Submit Score";
        submitButton.onclick = function() {
            //* d = new Date();
            //* function pad(number) {
            //*     if (number < 10) {
            //*         return '0' + number;
            //*     }
            //*     return number;
            //* }
            //* dateString = d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
            window.location.href="https://docs.google.com/forms/d/e/1FAIpQLSeHpBILdNKahqKOdgv4-yAa1Z2c4bB_liAUH0-nMWGjf13R1Q/viewform";
        };
        div.appendChild(submitButton);

        // category rules button
        let divrules = document.createElement('div');
        divrules.className = "rulesdiv";
        if (SHOWGLOBAL[category] == "yes") {
            divrules.textContent = GLOBALRULES + "\n" + CATEGORYRULES[category];
        }
        else {
            divrules.textContent = CATEGORYRULES[category];
        }
        divrules.innerHTML = divrules.innerHTML.autoLink();
        
        let rulesButton = document.createElement('button');
        rulesButton.className = 'rules';
        rulesButton.textContent = "Category Rules";
        rulesButton.onclick = function() {
            if (divrules.style.maxHeight){
                //slide back up
                divrules.style.maxHeight = null;
            } else {
                //slide it out
                divrules.style.maxHeight = divrules.scrollHeight + "px";
            }
        };
        div.appendChild(rulesButton);

        // category name
        let catName = document.createElement('h2');
        catName.textContent = category;
        div.appendChild(catName);

        // table and header row
        let tbl = document.createElement('table');
        div.appendChild(tbl);

        //dropdown collapsible content. put it in its own tr/td
        let divtr = tbl.insertRow();
        divtr.className = "rulestr";
        let divtd = divtr.insertCell();
        divtd.className = "rulestr";
        divtd.colSpan = "999";
        divtd.appendChild(divrules);

        let tr = tbl.insertRow();
        for (let field of FIELDSTODISPLAY) {
            let th = document.createElement('th');
            th.textContent = field;
            tr.appendChild(th);
        }

        categoryObjs.set(category, new CategoryObject(btn, div, tbl));

        mainContainer.appendChild(div);
    }
}

function parseCategories() {
	//FUCK YOU GOOGLE SHEETS
	GLOBALRULES =
"I HAVEN't GOTTEN THE FUCKING RULES YET"
	
	hardcodecategories = 		[ "v1.0", "v1.0.2"];
	hardcodeshowglobalrules = 	[ "yes", "yes"];
	hardcoderules = 			[ 
"play on the 1.0 version :I ",
"play on the 1.0.2 version :I "]
	for (let i = 0; i < hardcodecategories.length; i++) {
		CATEGORIES.push(hardcodecategories[i])
		SHOWGLOBAL[CATEGORIES[CATEGORIES.length-1]] = hardcodeshowglobalrules[i]
		CATEGORYRULES[CATEGORIES[CATEGORIES.length-1]] = hardcoderules[i]
	}
	console.log(CATEGORIES);
}

function parseRuns(data) {
	console.log("hi");
	console.log(data);
    let fields = [];
    let runs = [];

    for (let i = 0; i < data.table.cols.length; i++) {
	    fields[i] = data.table.cols[i].label;
    }

    console.log("fields done");

    for (let i = 0; i < data.table.rows.length; i++) {
	    console.log("run " + (i+1));
	    runs[i] = {}
	    for (let field of fields) {
            // prefill all the fields, because some are optional but shouldn't be undefined
            if (field != undefined) runs[i][field] = "";
        }
	
	    entry = data.table.rows[i].c
        
	    for (let j = 0; j < entry.length; j++) {
		    if (entry[j] != undefined) {
			    if (entry[j].f != undefined) {
			    	runs[i][fields[j]] = entry[j].f
			    }
			    else if (entry[j].v != undefined) {
			    	runs[i][fields[j]] = entry[j].v
			    }
		    }
	    }
    }
    console.log(runs)
    return runs;
}

function formatRun(run, placeInt) {
    run.Place = formatPlace(placeInt);
}

function populateTables(runs) {
    for (let run of runs) {
        categoryObjs.get(run.Version).add(run);
    }
    console.log("tables populated");
}

function formatPlace(placeInt) {
    if (placeInt % 10 === 1 && placeInt % 100 !== 11)
        return placeInt + "st";
    else if (placeInt % 10 === 2 && placeInt % 100 !== 12)
        return placeInt + "nd";
    else if (placeInt % 10 === 3 && placeInt % 100 !== 13)
        return placeInt + "rd";
    else
        return placeInt + "th";
}