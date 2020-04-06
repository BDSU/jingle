let audioAnalyser;
let audioContext;
let audioElement;
let logoElement;

window.addEventListener('load', init);

function init() {
	logoElement = document.querySelector('.logo');

	audioElement = document.querySelector('audio');
	audioElement.addEventListener('play', initAudio);

	document.body.addEventListener('keypress', event => {
		if (event.code === 'Space') {
			if (audioElement.paused) {
				audioElement.play();
			} else {
				audioElement.pause();
			}
		}
	});
	// stop propagation when focus is on the audio controls
	// otherwise pressing space could trigger the above toggle
	// *and* play/pause via the controls
	document.querySelector('.controls').addEventListener('keypress', event => event.stopPropagation());

	document.body.addEventListener('mousemove', event => {
		logoElement.style.setProperty('--rotateX', 45 * (1 - 2 * event.pageY/document.body.offsetHeight));
		logoElement.style.setProperty('--rotateY', 45 * (1 - 2 * event.pageX/document.body.offsetWidth));
	});

	window.addEventListener('hashchange', updateFeatureClasses);
	updateFeatureClasses();
}

function updateFeatureClasses() {
	['no-shadow', 'no-blur'].forEach(className => {
		if (location.hash.indexOf(className) !== -1) {
			document.body.classList.add(className);
		} else {
			document.body.classList.remove(className);
		}
	});
}

function initAudio() {
	audioElement.removeEventListener('play', initAudio);

	if (!window.AudioContext) {
		// Safari implements AudioContext with 'webkit' prefix
		window.AudioContext = window.webkitAudioContext;
	}
	audioContext = new AudioContext();

	audioAnalyser = audioContext.createAnalyser();
	audioAnalyser.smoothingTimeConstant = 0.3;
	audioAnalyser.fftSize = 1024;

	const audioSourceNode = audioContext.createMediaElementSource(audioElement);
	audioSourceNode.connect(audioAnalyser);
	audioSourceNode.connect(audioContext.destination);

	requestAnimationFrame(processVolume);
}

function processVolume() {
	const frequenceData =  new Uint8Array(audioAnalyser.frequencyBinCount);
	audioAnalyser.getByteFrequencyData(frequenceData);

	const ranges = [
		{name: 'vol', start: 0, end: 512},
		{name: 'vol-range1', start:   0, end: 128},
		{name: 'vol-range2', start: 128, end: 256},
		{name: 'vol-range3', start: 256, end: 364},
		{name: 'vol-range4', start: 364, end: 512},
	];
	ranges.forEach(range => {
		const rangeData = frequenceData.slice(range.start, range.end);
		let vol = getAverageVolume(rangeData);

		// enforce a minimal value of 0.01 to prevent overlapping artifacts
		vol = Math.max(vol, 0.01);

		logoElement.style.setProperty(`--${range.name}`, vol);
	});

	requestAnimationFrame(processVolume);
}

function getAverageVolume(frequenceData) {
	let sum = 0;
	for (let i = 0; i < frequenceData.length; i++) {
		sum += frequenceData[i];
	}

	return sum / frequenceData.length;
}
