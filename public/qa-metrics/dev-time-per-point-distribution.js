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





	const issuesPromise = jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
		jql: `project = "YUMPOS" and "Actual Release[Labels]" != EMPTY and issueType not in (Initiatives, Epic)`,
		fields: ["summary","Story Points"],
		expand: ["changelog"]
	});
	const {data} = await dataAndLabelsPromise;

	const filteredData = data.filter( ({x,y}) => y > 1  )

	const timePerPoints = filteredData.map( item => item.y / item.x );



	const filteredTimePerPoints = timePerPoints.filter( v => v > 1 / 24 && v < 7)

	const sum = timePerPoints.reduce((last, current)=> last+current, 0);
	console.log("average", sum / timePerPoints.length, getStandardDeviation(timePerPoints),
	filteredTimePerPoints.reduce((last, current)=> last+current, 0) / filteredTimePerPoints.length);


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
