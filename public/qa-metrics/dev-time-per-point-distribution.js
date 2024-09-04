import Chart from "./chart.js";
import {getDataAndLabelsFromIssues, getRandomColor, niceTimeFromDays, getStandardDeviation} from "./helpers.js";

export async function devTimePerPointDistribution(jiraHelpers, dataAndLabelsPromise){

	const div = document.createElement("div");
	div.innerHTML = "<h2>Distribution of DevTime / Story points</h2>"
	//div.style.width = "800px";
	//div.style.height ="1200px";
	const myChart = document.createElement("canvas");
	div.append(myChart);
	document.body.append(div);




	/*
	const issuesPromise = jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
		jql: `project = "RODS" and issueType not in (Initiative, Epic)`,
		fields: ["summary","Story Points"],
		expand: ["changelog"]
	});*/
	const promiseData = await dataAndLabelsPromise;
	const {data} = promiseData;

	// X is the number of Points, Y is the number of days.
	// Elimiate stuff that was finished in one day
	const filteredData = data.filter( ({x,y}) => y > 1  )

	// Calculate the amount of time for each point for every story
	const timePerPoints = filteredData.map( item => item.y / item.x );

	// get rid of extremes
	// - less than a point = hour
	// - more than 7 days per point
	const filteredTimePerPoints = timePerPoints.filter( v => v > 1 / 24 && v < 7)

	const sum = timePerPoints.reduce((last, current)=> last+current, 0);
	console.log("source count",data.length, "count", timePerPoints.length,
			"average", 
			sum / timePerPoints.length, 
			"std",
			getStandardDeviation(timePerPoints),
			"average without extremes",
		filteredTimePerPoints.reduce((last, current)=> last+current, 0) / filteredTimePerPoints.length
	);


	const max = Math.max(...filteredTimePerPoints);
	const min = Math.min( ...filteredTimePerPoints);
	const BANDS = 20;
	const width = max / BANDS;

	const counts = new Array(BANDS).fill(0 );
	filteredTimePerPoints.forEach(value => {
		const index = Math.floor( (value - min) / max * BANDS)
		counts[index === BANDS ? BANDS-1: index]++;
	});

	const labels = counts.map((count, index) => {
		return niceTimeFromDays(min + index*width);
	});

	/*const finalData = counts.map((count, index) => {
		return {x: index*width, y: count};
	})*/



	const timeVsPoints = new Chart(myChart, {
			type: 'bar',
			data: {
				labels: labels,
			  datasets: [{
					label: "All Releases",
					data: counts,
					backgroundColor: getRandomColor(),
				}],
			},
			options: {
		    scales: {
					y: {
						beginAtZero: true
					}
		    }/*,
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
				}*/
		  }
	});
}
