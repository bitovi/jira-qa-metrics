
import semver from "../steerco-reporting/semver.js";

export async function getDataAndLabelsFromIssues(issuesPromise) {
	const issues = await issuesPromise;

	const issueResults = issues.map( (issue) => {
		return {
			summary: issue.fields.Summary,
			storyPoints: issue.fields["Story Points"],
			//changeLogComplete: isChangelogComplete(issue.changelog),
			inDevDays: calculateTimeInStatus(issue.changelog, "In Development") / (1000*60*60*24)
		}
	});

	const onlyValues = issueResults.filter(result => result.storyPoints && result.inDevDays)
	const data = onlyValues.map( result => {
		return {x: result.storyPoints, y: result.inDevDays, label: result.summary}
	})
	const labels = onlyValues.map(result => result.summary);
	return {labels, data};
}





export function isChangelogComplete(changelog) {
	return changelog.histories.length === changelog.total
}

export function calculateTimeInStatus(changelog, status = "In Development"){
	let totalTime = 0;
	let currentStatus = "To Do";
	let inDevelopmentTime;
	const reversed = [...changelog].reverse();

	reversed.forEach( (history) => {
		history.items.forEach( (changeItem)=> {
			if(changeItem.field === "status") {
				if( changeItem.toString === status ) {
					inDevelopmentTime = new Date(history.created);
				} else if(changeItem.fromString === status) {
					if(!inDevelopmentTime) {
						console.error("No "+status+" time.")
					} else {
						totalTime += new Date(history.created) - inDevelopmentTime;
						if(totalTime < 0) {
							debugger;
						}
						inDevelopmentTime = undefined;
					}

				}

			}
		})
	})

	return totalTime;
}
/*
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}*/

const colors = ["red","green","blue","orange","yellow","brown","cyan","deeppink","lawngreen","tan"];
let colorIndex = 0;
export function getRandomColor(){
	const color = colors[colorIndex++];
	if(colorIndex >= colors.length) {
		colorIndex = 0;
	}
	return color;
}


export function niceTimeFromDays(days) {
	if(days < 1) {
		return (days * 24).toFixed(1)+"h"
	} else {
		return Math.floor(days)+"d "+((days % 1)*24).toFixed(1)+"h"
	}
}

export function getStandardDeviation (array) {
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}


export function semverSort(values) {
	const cleanMap = {};
	const cleanValues = [];
	values.forEach( (release) => {
		const clean = release.replace(/^[^\d]+/,"").replace(".X",".0");
		if( semver.clean(clean) ){
			cleanMap[clean] = release;
			cleanValues.push(clean);
		}

	});
	const cleanSorted = semver.sort(cleanValues);
	return cleanSorted.map( clean => cleanMap[clean]);
}
