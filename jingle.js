let audioAnalyser;
let audioContext;
let audioElement;
let logoElements;
let fileInputElement;

window.addEventListener('load', init);

function init() {
	logoElements = document.querySelectorAll('.logo');

	audioElement = document.querySelector('audio');
	audioElement.addEventListener('play', initAudio);

	fileInputElement = document.querySelector('input[type=file]');
	fileInputElement.addEventListener('change', event => {
		if (!fileInputElement.files || !fileInputElement.files.length) {
			return;
		}

		const fileUrl = URL.createObjectURL(fileInputElement.files[0]);
		audioElement.src = fileUrl;
	});

	// attach listener to dragover to make body a drop zone
	document.body.addEventListener('dragover', event => event.preventDefault());
	document.body.addEventListener('drop', event => {
		if (!event.dataTransfer.files || !event.dataTransfer.files.length) {
			return;
		}

		event.preventDefault();

		const fileUrl = URL.createObjectURL(event.dataTransfer.files[0]);
		audioElement.src = fileUrl;
	});

	if (navigator.mediaDevices.getUserMedia) {
		const micCheckbox = document.querySelector('input[name=mic]');
		micCheckbox.disabled = false;

		let micSourceNode;
		micCheckbox.addEventListener('change',  event => {
			if (!audioContext) {
				initAudio();
			}

			if (micCheckbox.checked) {
				navigator.mediaDevices.getUserMedia({audio: true})
					.then(stream => {
						micSourceNode = audioContext.createMediaStreamSource(stream);
						micSourceNode.connect(audioAnalyser);
					})
					.catch(error => {
						micCheckbox.checked = false;
						micCheckbox.disabled = true;
						console.warn(error);
					});
			} else {
				// stop all input tracks so mic is freed and can be closed again
				micSourceNode.mediaStream.getTracks().forEach(track => track.stop());
				micSourceNode.disconnect();
				micSourceNode = null;
			}
		});
	}

	document.body.addEventListener('keypress', event => {
		if (event.code === 'Space') {
			if (audioElement.paused) {
				audioElement.play();
			} else {
				audioElement.pause();
			}
		}

		if (event.key === 'f') {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				document.body.requestFullscreen();
			}
		}
	});
	// stop propagation when focus is on the audio controls
	// otherwise pressing space could trigger the above toggle
	// *and* play/pause via the controls
	document.querySelector('.controls').addEventListener('keypress', event => event.stopPropagation());

	document.body.addEventListener('click', event => {
		document.body.requestFullscreen();

		if (audioElement.paused) {
			audioElement.play();
		} else {
			audioElement.pause();
		}
	});
	// stop propagation when clicking on controls, see above
	document.querySelector('.controls').addEventListener('click', event => event.stopPropagation());

	document.querySelector('input[name=loop]').addEventListener('change', event => {
		audioElement.loop = event.target.checked;
	});

	let mouseLastUpdate = 0;
	document.body.addEventListener('mousemove', event => {
		mouseLastUpdate = Date.now();
		document.body.classList.remove('idle');
		setLogoProperty('--rotateX', 45 * (1 - 2 * event.pageY/document.body.offsetHeight));
		setLogoProperty('--rotateY', 45 * (1 - 2 * event.pageX/document.body.offsetWidth));
	});

	setInterval(() => {
		if (Date.now() - mouseLastUpdate > 1000) {
			document.body.classList.add('idle');
		}
	}, 1000);

	window.addEventListener('deviceorientation', event => {
		if (event.alpha === null) {
			return;
		}

		mouseLastUpdate = Date.now();
		document.body.classList.remove('idle');
		document.body.classList.add('mobile');

		setLogoProperty('--rotateX', event.beta);
		setLogoProperty('--rotateY', event.gamma);
		setLogoProperty('--rotateZ', event.alpha);
	});

	if (window.screen && screen.orientation) {
		screen.orientation.addEventListener('change', event => {
			setLogoProperty('--screenOrientation', event.target.angle);
		});
		setLogoProperty('--screenOrientation', screen.orientation.angle);
	} else if ('orientation' in window){
		window.onorientationchange = () => {
			setLogoProperty('--screenOrientation', window.orientation);
		};
		setLogoProperty('--screenOrientation', window.orientation);
	}

	window.addEventListener('hashchange', updateFeatureClasses);
	updateFeatureClasses();
}

function setLogoProperty(prop, value) {
	logoElements.forEach(logo => logo.style.setProperty(prop, value));
}

function updateFeatureClasses() {
	['no-shadow', 'no-blur', 'vr'].forEach(className => {
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

	if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: 'jingle',
			artist: 'BDSU',
			album: 'Best of Plenum',
			artwork: [
				{src: './bdsu-logo.png', sizes: '512x512', type: 'image/png'},
			],
		});

		navigator.mediaSession.setActionHandler('play', () => audioElement.play());
		navigator.mediaSession.setActionHandler('pause', () => audioElement.pause());
		navigator.mediaSession.setActionHandler('previoustrack', () => audioElement.currentTime = 0);
		navigator.mediaSession.setActionHandler('nexttrack', () => audioElement.currentTime = 0);
	}

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

		setLogoProperty(`--${range.name}`, vol);
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
