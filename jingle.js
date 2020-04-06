let audioAnalyser;
let audioContext;
let audioElement;
let logoElement;

window.addEventListener('load', init);

function init() {
	logoElement = document.querySelector('.logo');

	audioElement = document.querySelector('audio');
	audioElement.addEventListener('play', initAudio);
}

function initAudio() {
	audioElement.removeEventListener('play', initAudio);

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

	const vol = getAverageVolume(frequenceData);
	logoElement.style.setProperty('--vol', vol);

	requestAnimationFrame(processVolume);
}

function getAverageVolume(frequenceData) {
	let sum = 0;
	for (let i = 0; i < frequenceData.length; i++) {
		sum += frequenceData[i];
	}

	return sum / frequenceData.length;
}
