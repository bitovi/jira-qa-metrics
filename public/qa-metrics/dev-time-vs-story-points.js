import Chart from "./chart.js";
import {getDataAndLabelsFromIssues, getRandomColor, calculateTimeInStatus} from "./helpers.js";

export async function plotTimeInDaysVsStoryPoints(jiraHelpers){

	const div = document.createElement("div");
	div.innerHTML = "<h2>Time in Days vs Story Points</h2>"
	const toggleForm = document.createElement("form");
	div.append(toggleForm);

	//div.style.width = "800px";
	//div.style.height ="1200px";
	const myChart = document.createElement("canvas");
	div.append(myChart);
	document.body.append(div);
	const datasets = [];

	const timeVsPoints = new Chart(myChart, {
			type: 'scatter',
			data: {
			  datasets: datasets,
			},
			options: {
		    scales: {
		      x: {
		        type: 'logarithmic',
		        position: 'bottom',
						title: {
							text: 'Story Points',
							display: true
						}
		      },
					y: {
						type: 'logarithmic',
						title: {
							text: 'Time in Days',
							display: true
						},
						min: 0
					}
		    },
				plugins: {
					tooltip: {
						callbacks: {
							label: function(ctx){
								let label = ctx.dataset.labels[ctx.dataIndex];
	              label += " (" + ctx.parsed.x + ", " + ctx.parsed.y + ")";
	              return label;
							}
						}
					}
				}
		  }
	});


	const issuesPromise = jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
		jql: `project = "RODS" and issueType not in (Initiative, Epic) and "Story Points[Number]" IS NOT EMPTY and status in (Done, Accepted)`,
		fields: ["summary","Story Points","Parent"],
		expand: ["changelog"]
	});
	//const {labels, data} = await getDataAndLabelsFromIssues(issuesPromise);
	const issues = await issuesPromise;
	const reasons = [];
	console.log({issues});
	//const issue = await jiraHelpers.fetchJiraIssueChangelog("YUMPOS-985");
	const releases = {};
	const issueResults = issues.forEach( (issue) => {
		let releaseName = issue.fields?.Parent?.key || "parent-less";
		let release = releases[releaseName];
		if(!release) {
			release = releases[releaseName] = {
				label: releaseName,
				backgroundColor: getRandomColor(),
				data: [],
				labels: []
			}
		}
		const points = issue.fields["Story Points"];
		const timeInDev = calculateTimeInStatus(issue.changelog, "In Development") / (1000*60*60*24);
		if(points && timeInDev) {
			release.labels.push(issue.fields.Summary);
			release.data.push({
				x: points,
				y: timeInDev
			});
		} else {
			if(!points && !timeInDev) {
				reasons.push("neither "+issue.key)
			} else if(!points) {
				reasons.push("points")
			} else {
				
				reasons.push("timeInDev"+issue.key)
			}
		}

	});

	for(let releaseName in releases) {
		if(releases[releaseName].data.length) {
			datasets.push(releases[releaseName]);
		}
		const span = document.createElement("span");
		span.innerHTML = `<input type='checkbox' CHECKED/> `+releaseName;
		const input = span.firstElementChild;
		input.releaseName = releaseName;
		input.onchange = function(){
			
			const toInclude = [...toggleForm.querySelectorAll("input")]
				.filter( el => el.checked)
				.map( el => {
					return releases[el.releaseName]
				})
			datasets.splice(0, datasets.length, ...toInclude);
			timeVsPoints.update();
		}
		toggleForm.append(span);
	}

	timeVsPoints.update();
	console.log(reasons);
	return {data: Object.values(releases).map( r => r.data).flat(1) };
	//return {labels, data};
}
