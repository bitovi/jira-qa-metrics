export default await new Promise( (resolve, reject)=>{
	const script = document.createElement("script");
	script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
	document.head.appendChild(script);
	script.onload = function(){
		resolve(Chart);
	}
	script.onerror = reject;
})
