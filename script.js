document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('handCanvas');
    const ctx = canvas.getContext('2d');
    const handImageInput = document.getElementById('handImage');
    const ringList = document.getElementById('ringList');
    let handImage = null;
    let selectedFinger = null;
    let selectedRing = null;
    let handDetections = null;

    // MediaPipe Hands 설정
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    // 반지 이미지 목록을 동적으로 로드
    function loadRingImages() {
        ringList.innerHTML = '';

        // assets 폴더에서 ring_로 시작하는 모든 PNG 이미지를 동적으로 로드
        fetch('assets/')
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const htmlDocument = parser.parseFromString(data, 'text/html');
                const imageElements = htmlDocument.querySelectorAll('a');
                imageElements.forEach(element => {
                    const href = element.getAttribute('href');
                    if (href && href.startsWith('ring_') && href.endsWith('.png')) {
                        const ringSrc = `assets/${href}`;
                        const ringItem = document.createElement('div');
                        ringItem.className = 'ring-item';
                        const img = document.createElement('img');
                        img.src = ringSrc;
                        img.alt = '반지';
                        ringItem.appendChild(img);
                        ringItem.addEventListener('click', () => selectRing(ringSrc));
                        ringList.appendChild(ringItem);
                    }
                });
            });
    }

    // 손 이미지 업로드 처리
    handImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                handImage = new Image();
                handImage.onload = () => {
                    // 캔버스 크기 조정
                    const maxWidth = window.innerWidth * 0.9;
                    const scale = maxWidth / handImage.width;
                    canvas.width = handImage.width * scale;
                    canvas.height = handImage.height * scale;
                    
                    // 이미지 그리기
                    ctx.drawImage(handImage, 0, 0, canvas.width, canvas.height);
                    
                    // 손 인식 실행
                    detectHand();
                };
                handImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 손가락 선택 처리
    document.querySelectorAll('.finger-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.finger-buttons button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedFinger = button.dataset.finger;
            drawRing();
        });
    });

    // 반지 선택 처리
    function selectRing(ringSrc) {
        // 이전에 선택된 반지의 selected 클래스 제거
        document.querySelectorAll('.ring-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 새로 선택된 반지에 selected 클래스 추가
        const selectedItem = Array.from(document.querySelectorAll('.ring-item')).find(item => 
            item.querySelector('img').src === ringSrc
        );
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        selectedRing = ringSrc;
        
        // 선택된 반지 미리보기 업데이트
        const preview = document.getElementById('selectedRingPreview');
        const previewImage = document.getElementById('selectedRingImage');
        previewImage.src = ringSrc;
        preview.style.display = 'block';

        drawRing();
    }

    // MediaPipe 결과 처리
    function onResults(results) {
        if (!results.multiHandLandmarks) return;

        // 손가락 랜드마크 매핑
        const fingerMapping = {
            thumb: [1, 2, 3, 4],
            index: [5, 6, 7, 8],
            middle: [9, 10, 11, 12],
            ring: [13, 14, 15, 16],
            pinky: [17, 18, 19, 20]
        };

        const landmarks = results.multiHandLandmarks[0];
        handDetections = {};

        // 캔버스 초기화 및 손 이미지 다시 그리기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(handImage, 0, 0, canvas.width, canvas.height);

        // 손가락 랜드마크 그리기
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 각 손가락의 랜드마크와 연결선 그리기
        Object.entries(fingerMapping).forEach(([finger, indices]) => {
            const base = landmarks[indices[0]];
            const firstJoint = landmarks[indices[1]];
            const secondJoint = landmarks[indices[2]];
            const tip = landmarks[indices[3]];
            
            // 손가락별 중간점 및 각도 계산
            let middleX, middleY, angle;
            switch(finger) {
                case 'thumb':
                    middleX = (secondJoint.x + firstJoint.x) / 2;
                    middleY = (secondJoint.y + firstJoint.y) / 2;
                    angle = Math.atan2(secondJoint.y - firstJoint.y, secondJoint.x - firstJoint.x) * 180 / Math.PI;
                    break;
                case 'index':
                    middleX = (landmarks[6].x + landmarks[5].x) / 2;
                    middleY = (landmarks[6].y + landmarks[5].y) / 2;
                    angle = Math.atan2(landmarks[6].y - landmarks[5].y, landmarks[6].x - landmarks[5].x) * 180 / Math.PI;
                    break;
                case 'middle':
                    middleX = (landmarks[10].x + landmarks[9].x) / 2;
                    middleY = (landmarks[10].y + landmarks[9].y) / 2;
                    angle = Math.atan2(landmarks[10].y - landmarks[9].y, landmarks[10].x - landmarks[9].x) * 180 / Math.PI;
                    break;
                case 'ring':
                    middleX = (landmarks[14].x + landmarks[13].x) / 2;
                    middleY = (landmarks[14].y + landmarks[13].y) / 2;
                    angle = Math.atan2(landmarks[14].y - landmarks[13].y, landmarks[14].x - landmarks[13].x) * 180 / Math.PI;
                    break;
                case 'pinky':
                    middleX = (landmarks[18].x + landmarks[17].x) / 2;
                    middleY = (landmarks[18].y + landmarks[17].y) / 2;
                    angle = Math.atan2(landmarks[18].y - landmarks[17].y, landmarks[18].x - landmarks[17].x) * 180 / Math.PI;
                    break;
            }
            
            // 손가락의 너비 계산 (기본값)
            const width = 30;
            
            // 손가락의 길이 계산
            const length = Math.sqrt(
                Math.pow(tip.x - base.x, 2) + 
                Math.pow(tip.y - base.y, 2)
            ) * canvas.width;

            handDetections[finger] = {
                x: middleX * canvas.width,
                y: middleY * canvas.height,
                width: width,
                height: length,
                angle: angle
            };

            // 손가락 랜드마크 그리기 (모든 마디 연결)
            // 주석 처리하여 표시선 제거
            // ctx.beginPath();
            // ctx.moveTo(base.x * canvas.width, base.y * canvas.height);
            // ctx.lineTo(firstJoint.x * canvas.width, firstJoint.y * canvas.height);
            // ctx.lineTo(secondJoint.x * canvas.width, secondJoint.y * canvas.height);
            // ctx.lineTo(tip.x * canvas.width, tip.y * canvas.height);
            // ctx.stroke();

            // 모든 랜드마크 점 그리기
            [base, firstJoint, secondJoint, tip].forEach((point, index) => {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
                ctx.fill();

                // 랜드마크 번호 표시
                ctx.fillStyle = 'white';
                ctx.fillText(indices[index].toString(), point.x * canvas.width, point.y * canvas.height);
                ctx.fillStyle = '#ff0000';
            });

            // 선택된 손가락 강조 표시
            if (finger === selectedFinger) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(base.x * canvas.width, base.y * canvas.height);
                ctx.lineTo(firstJoint.x * canvas.width, firstJoint.y * canvas.height);
                ctx.lineTo(secondJoint.x * canvas.width, secondJoint.y * canvas.height);
                ctx.lineTo(tip.x * canvas.width, tip.y * canvas.height);
                ctx.stroke();
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
            }
        });

        drawRing();
    }

    // 손 인식 함수
    function detectHand() {
        if (!handImage) return;

        // 캔버스에서 이미지를 다시 그린 후 MediaPipe에 전달
        ctx.drawImage(handImage, 0, 0, canvas.width, canvas.height);
        hands.send({image: canvas});
    }

    // 반지 그리기
    function drawRing() {
        if (!handImage || !selectedFinger || !selectedRing || !handDetections) return;

        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(handImage, 0, 0, canvas.width, canvas.height);

        const finger = handDetections[selectedFinger];
        if (!finger) return;

        // 반지 이미지 로드 및 그리기
        const ringImg = new Image();
        ringImg.onload = () => {
            // 반지 크기 조정 (손가락 너비의 1.2배)
            const ringWidth = finger.width * 1.2;
            const ringHeight = ringWidth * (ringImg.height / ringImg.width);

            // 반지 위치 계산
            const x = finger.x;
            const y = finger.y;

            // 회전 적용
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((finger.angle + 90) * Math.PI / 180);
            
            // 반지 위치 미세 조정 (각 손가락별로 다르게)
            let offsetX = 0;
            let offsetY = 0;
            
            switch(selectedFinger) {
                case 'thumb':
                    offsetX = -ringWidth * 0.1;
                    offsetY = -ringHeight * 0.2;
                    break;
                case 'index':
                    offsetX = -ringWidth * 0.05;
                    offsetY = -ringHeight * 0.15;
                    break;
                case 'middle':
                    offsetX = 0;
                    offsetY = -ringHeight * 0.15;
                    break;
                case 'ring':
                    offsetX = ringWidth * 0.05;
                    offsetY = -ringHeight * 0.15;
                    break;
                case 'pinky':
                    offsetX = ringWidth * 0.1;
                    offsetY = -ringHeight * 0.2;
                    break;
            }

            ctx.drawImage(ringImg, 
                -ringWidth / 2 + offsetX, 
                -ringHeight / 2 + offsetY, 
                ringWidth, 
                ringHeight
            );
            ctx.restore();
        };
        ringImg.src = selectedRing;
    }

    // 초기 반지 이미지 로드
    loadRingImages();
}); 