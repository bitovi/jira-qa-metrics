// https://yumbrands.atlassian.net/issues/?filter=10897
import { StacheElement, type, ObservableObject, stache } from "//unpkg.com/can@6/core.mjs";

import {getCalendarHtml, getQuarter} from "./quarter-timeline.js";
import {howMuchHasDueDateMovedForwardChangedSince, DAY_IN_MS} from "./date-helpers.js";

const dateFormatter = new Intl.DateTimeFormat('en-US', {day: "numeric", month: "short"})

const inQAStatus = {"QA": true, "In QA": true};
const inDevStatus = {"In Development": true};
const inPartnerReviewStatus = {"Partner Review": true};
const inDoneStatus = {"Done": true};



class SteercoTimeline extends StacheElement {
	static view = `

		<div class='calendar_wrapper'>{{this.calendarHTML}}</div>
		<div class='gantt' style="position: relative; top: -50px; padding: 0px 24px">{{# for(chart of this.releaseGantt) }}
			{{chart}}
		{{/}}
			<div class='today' style="margin-left: {{this.todayMarginLeft}}%"></div>
		</div>
		<div class='release_wrapper'>

		{{# for(release of this.releases) }}
			<div class='release_box'>
				<div class="release_box_header_bubble status-{{release.status}}">{{release.shortName}}</div>
				<div class="release_box_subtitle">
					{{# if(not(eq(release.release, "Next")))}}
						<div class="release_box_subtitle_wrapper">
								<span class="release_box_subtitle_key">Dev</span>
								<span class="release_box_subtitle_value">
									{{ this.prettyDate(release.dev.due) }}{{this.wasReleaseDate(release.dev)}}
								</span>
						</div>
						<div class="release_box_subtitle_wrapper">
								<span class="release_box_subtitle_key">QA&nbsp;</span>
								<span class="release_box_subtitle_value">
									{{ this.prettyDate(release.qa.due) }}{{this.wasReleaseDate(release.qa)}}
								</span>
						</div>
						<div class="release_box_subtitle_wrapper">
								<span class="release_box_subtitle_key">UAT</span>
								<span class="release_box_subtitle_value">
									{{ this.prettyDate(release.uat.due) }}{{this.wasReleaseDate(release.uat)}}
								</span>
						</div>
					{{/ if }}
				</div>
				<ul class="release_box_body">
					{{# for(initiative of release.initiatives) }}
					 <li>
						<span class='status-{{initiative.devStatus}}'>D</span>
						{{initiative.Summary}}
					 </li>
					{{/ for}}
				</ul>
			</div>
		{{/ }}

		</div>
	`
	get calendarData(){
		const startDate = new Date(
			new Date().getFullYear(),
			Math.floor( new Date().getMonth() / 3 ) * 3
		);
		const hasDate = this.releases.filter( r => r.team.due );
		const lastRelease = hasDate[hasDate.length - 1];
		const endDate = lastRelease.team.due;
		return getCalendarHtml(startDate, endDate);
	}
	//const {html, firstDay, lastDay}
	get calendarHTML(){
		return stache.safeString(this.calendarData.html);
	}
	get todayMarginLeft(){
		const {firstDay, lastDay} = this.calendarData;
		const totalTime = (lastDay - firstDay);
		return (new Date() - firstDay- 1000*60*60*24*2) / totalTime * 100;
	}
	get releaseGantt(){
		const {firstDay, lastDay} = this.calendarData;
		const totalTime = (lastDay - firstDay);
		console.log("f",firstDay,"l", lastDay);

		return this.releases.map( (release, index) => {

			const div = document.createElement("div");

			if(release.team.start && release.team.due) {
				const width = ((release.team.due - release.team.start) / totalTime  ) ;

				//div.style.top = (index * 20)+"px";
				div.style.width = (width * 100)+ "%";
				div.style.marginLeft = ((release.team.start - firstDay) / totalTime * 100) + "%";

				div.className = "release_time " //+this.releaseQaStatus(release);


				const dev = document.createElement("div");
				dev.className = "dev_time " //+this.releaseDevStatus(release);

				const devWidth = ((release.dev.due - release.dev.start) / totalTime  );
				dev.style.width = (devWidth / width * 100)+ "%";
				div.appendChild(dev);

				const qa = document.createElement("div");
				qa.className = "qa_time " //+this.releaseDevStatus(release);

				const qaWidth = ((release.qa.due - release.qa.start) / totalTime  );
				qa.style.width = (qaWidth / width * 100)+ "%";
				div.appendChild(qa);


				const uat = document.createElement("div");
				uat.className = "uat_time "; //+this.releaseUatStatus(release);
				const uatWidth = ((release.uat.due - release.uat.start) / totalTime  ) ;

				uat.style.width = (uatWidth/ width * 100 )+ "%";
				div.appendChild(uat);

				div.appendChild(document.createTextNode(release.shortName))

			}


			return div;
		})

	}
	prettyDate(date){
		return date ? dateFormatter.format(date) : "";
	}
	wasReleaseDate(release){

		const current = release.due;
		const was = release.dueLastPeriod;

		if(current - DAY_IN_MS > was) {
			return " ("+this.prettyDate(was)+")";
		} else {
			return ""
		}
	}
}



customElements.define("steerco-timeline", SteercoTimeline);
