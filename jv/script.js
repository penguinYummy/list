document.addEventListener('DOMContentLoaded', function() {
    const todoContainer = document.getElementById('todoContainer');
    const container2 = document.querySelector('.container2');
    const timelines = document.querySelectorAll('.timeline');
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    // 일정 저장 객체 (로컬 스토리지 사용을 위한 준비)
    let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};
    // **[추가]** Todo List 저장 객체
    let todos = JSON.parse(localStorage.getItem('todoList')) || {}; 
    
    let selectedDateKey = null; 
    let selectedHour = null;
    let editingEventId = null;

    // 헬퍼 함수: YYYY-M-D 형식의 날짜 키 생성
    function createDateKey(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    // 헬퍼 함수: URL에서 타겟 날짜 가져오기 (주간 뷰에서 사용)
    function targetDateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('date');
        if (dateParam) {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(today);
    }

    // 현재 날짜와 시간 표시
    function updateDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        if (container2) {
            container2.textContent = `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // 일정 데이터 로컬 스토리지에 저장
    function saveEvents() {
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    }
    
    // **[추가]** Todo 데이터 로컬 스토리지에 저장
    function saveTodos() {
        localStorage.setItem('todoList', JSON.stringify(todos));
    }

    // -----------------------------------------------------------------
    // 💡 Todo List 기능 (날짜별 저장 및 로드 기능 추가)
    // -----------------------------------------------------------------
    
    // **[수정]** 초기 Todo 입력 필드 설정
    const initialInput = todoContainer ? todoContainer.querySelector('.input') : null;
    if (initialInput) {
        // Todo List의 기본 구조를 비우고, 포커스된 날짜의 데이터를 로드합니다.
        todoContainer.innerHTML = '';
        renderTodo();
    }

    // **[추가]** Todo 항목을 로컬 스토리지에 저장
    function addTodoItem(dateKey, content, isChecked = false) {
        if (!todos[dateKey]) {
            todos[dateKey] = [];
        }
        todos[dateKey].push({
            id: Date.now() + Math.random(), // 고유 ID 부여
            content: content,
            checked: isChecked
        });
        saveTodos();
    }
    
    // **[추가]** Todo 항목을 업데이트하고 다시 그리기
    function updateTodo(dateKey, itemId, newContent, newChecked) {
        if (todos[dateKey]) {
            const item = todos[dateKey].find(t => t.id == itemId);
            if (item) {
                if (newContent !== undefined) item.content = newContent;
                if (newChecked !== undefined) item.checked = newChecked;
            }
            // 내용이 비었으면 삭제 처리
            if (newContent !== undefined && newContent.trim() === '') {
                 todos[dateKey] = todos[dateKey].filter(t => t.id != itemId);
            }
            saveTodos();
        }
    }

    // **[추가]** 포커스된 날짜의 Todo List 렌더링
    function renderTodo() {
        if (!todoContainer) return;
        
        // **selectedDateKey가 주간 뷰에서 설정되어야 합니다.**
        const currentTodoKey = selectedDateKey || createDateKey(targetDateFromUrl());
        
        // 기존 내용 초기화
        todoContainer.innerHTML = '';
        
        const currentTodos = todos[currentTodoKey] || [];
        
        currentTodos.forEach(item => {
            const newTodoItem = createTodoElement(item.content, item.checked, item.id);
            todoContainer.appendChild(newTodoItem);
        });
        
        // 마지막에 빈 입력 필드 추가 (새 항목 추가용)
        const emptyItem = createTodoElement('', false, null, true);
        todoContainer.appendChild(emptyItem);
        
        updateTodoNumbers();
    }
    
    // **[추가]** Todo DOM 요소 생성 함수
    function createTodoElement(content, isChecked, id, isEmpty = false) {
        const newTodoItem = document.createElement('div');
        newTodoItem.className = 'todo-item';
        if (id) newTodoItem.dataset.id = id;
        
        const checkedClass = isChecked ? ' checked' : '';
        const readonlyAttr = isEmpty ? '' : 'readonly';
        
        newTodoItem.innerHTML = `
            <span class="todo-number"></span>
            <input type="text" class="input" value="${content}" ${readonlyAttr}>
            <div class="checkbox${checkedClass}" data-action="check">✓</div>
        `;
        
        const inputElement = newTodoItem.querySelector('.input');
        const checkboxElement = newTodoItem.querySelector('.checkbox');

        // 입력 이벤트 (내용 변경 및 저장)
        inputElement.addEventListener('input', function() {
            // 내용이 비면 즉시 삭제 (마지막 빈 필드는 제외)
            if (this.value.trim() === '' && !isEmpty) {
                 newTodoItem.remove();
                 updateTodo(selectedDateKey || createDateKey(targetDateFromUrl()), id, this.value.trim());
                 updateTodoNumbers();
                 return;
            }
        });

        // Enter 키 입력 (저장/새 항목 추가)
        inputElement.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const trimmedValue = this.value.trim();
                
                if (isEmpty && trimmedValue !== '') {
                    // 새 항목 추가
                    addTodoItem(selectedDateKey || createDateKey(targetDateFromUrl()), trimmedValue);
                    this.value = trimmedValue;
                    
                    // 기존 빈 필드를 실제 항목으로 변경
                    newTodoItem.dataset.id = todos[selectedDateKey].slice(-1)[0].id;
                    this.removeAttribute('readonly');
                    checkboxElement.dataset.action = 'check'; 
                    
                    // 새 항목 렌더링 (마지막에 빈 항목 추가 포함)
                    renderTodo();
                    
                } else if (!isEmpty) {
                    // 기존 항목 수정
                    updateTodo(selectedDateKey || createDateKey(targetDateFromUrl()), id, trimmedValue);
                    this.blur();
                }
            }
        });
        
        // 포커스 해제 시 저장 (읽기 전용 토글)
        inputElement.addEventListener('blur', function() {
            if (!isEmpty && this.value.trim() !== '') {
                updateTodo(selectedDateKey || createDateKey(targetDateFromUrl()), id, this.value.trim());
                this.setAttribute('readonly', 'readonly');
            }
        });
        
        // 클릭 시 읽기 전용 해제
        inputElement.addEventListener('click', function() {
            this.removeAttribute('readonly');
        });
        
        // 체크박스 클릭 이벤트
        checkboxElement.addEventListener('click', function() {
            const isChecked = this.classList.toggle('checked');
            if (!isEmpty) {
                 updateTodo(selectedDateKey || createDateKey(targetDateFromUrl()), id, undefined, isChecked);
            }
        });

        return newTodoItem;
    }

    function updateTodoNumbers() {
        if (!todoContainer) return;
        const todoItems = todoContainer.querySelectorAll('.todo-item');
        let count = 0;
        todoItems.forEach((item, idx) => {
            const input = item.querySelector('.input');
            // 빈 입력 필드는 번호에서 제외
            if (input && input.value.trim() !== '') {
                 count++;
                 const numberSpan = item.querySelector('.todo-number');
                 if (numberSpan) {
                     numberSpan.textContent = count + '. ';
                 }
            } else {
                 const numberSpan = item.querySelector('.todo-number');
                 if (numberSpan) {
                     numberSpan.textContent = ''; // 빈 필드는 번호 제거
                 }
            }
        });
    }

    // -----------------------------------------------------------------
    // 월별 달력 기능 (수정 없음)
    // -----------------------------------------------------------------
    const monthCalendar = document.getElementById('monthCalendar');
    // ... (기존 월별 달력 기능 유지) ...
    if (monthCalendar) {
        let currentYear = today.getFullYear();
        let currentMonth = today.getMonth();
        
        generateMonthCalendar(currentYear, currentMonth);
        
        document.getElementById('prevMonth')?.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateMonthCalendar(currentYear, currentMonth);
        });
        
        document.getElementById('nextMonth')?.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateMonthCalendar(currentYear, currentMonth);
        });
    }

    function generateMonthCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        monthCalendar.querySelectorAll('.monthbox').forEach(box => box.remove());
        
        // 빈 칸
        for (let i = 0; i < firstDayOfWeek; i++) {
            monthCalendar.insertAdjacentHTML('beforeend', '<div class="monthbox"></div>');
        }
        
        // 날짜
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = createDateKey(new Date(year, month, day));
            // **[추가]** 일정/Todo 데이터 존재 여부 확인
            const hasEvent = (events[dateKey] && events[dateKey].length > 0) || (todos[dateKey] && todos[dateKey].length > 0);
            
            const isToday = year === todayYear && month === todayMonth && day === todayDate;
            const todayClass = isToday ? ' today' : '';
            
            monthCalendar.insertAdjacentHTML('beforeend', `
                <div class="monthbox${todayClass}" data-year="${year}" data-month="${month}" data-day="${day}">
                    <div class="monthboxday">${year}. ${month + 1}. ${day}</div>
                    ${hasEvent ? '<div class="event-marker"></div>' : ''} </div>
            `);
        }
        
        // 나머지 빈 칸
        const totalBoxes = firstDayOfWeek + daysInMonth;
        const remainingBoxes = 42 - totalBoxes;
        for (let i = 0; i < remainingBoxes; i++) {
            monthCalendar.insertAdjacentHTML('beforeend', '<div class="monthbox"></div>');
        }
    }

    // 월별 달력 클릭 이벤트
    monthCalendar?.addEventListener('click', function(e) {
        const monthBox = e.target.closest('.monthbox');
        if (monthBox && monthBox.dataset.year) {
            const {year, month, day} = monthBox.dataset;
            window.location.href = `index.html?date=${year}-${parseInt(month) + 1}-${day}`;
        }
    });

    // -----------------------------------------------------------------
    // 💡 주간 뷰 기능 (포커스 및 이동 기능 추가)
    // -----------------------------------------------------------------
    
    if (timelines.length > 0) {
        
        function getWeekStart(date) {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return weekStart;
        }

        let focusedDate = targetDateFromUrl();
        let currentWeekStart = getWeekStart(focusedDate);
        
        // **[추가]** 날짜를 이동하고 주간 뷰를 리로드하는 함수
        function navigateToDate(targetDate) {
            const newDateKey = createDateKey(targetDate);
            const [year, month, day] = newDateKey.split('-').map(Number);
            
            // URL 파라미터를 업데이트하여 페이지 리로드 (주간 뷰 변경)
            window.location.href = `index.html?date=${year}-${month}-${day}`;
        }

        // 시간 슬롯 동적 생성 (기존 유지)
        function createTimeSlots() {
            timelines.forEach(timeline => {
                const content = timeline.querySelector('.timeline-content');
                content.innerHTML = ''; 
                for (let hour = 0; hour < 24; hour++) {
                    const slot = document.createElement('div');
                    slot.dataset.hour = hour;
                    slot.style.height = (100 / 24) + '%'; 
                    slot.classList.add('time-slot'); 
                    content.appendChild(slot);
                }
            });
        }
        
        // 메인 함수
        function displayWeekDates(sunday) {
            const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
            const focusedDateKey = createDateKey(focusedDate); // 포커스된 날짜의 키
            
            timelines.forEach((timeline, i) => {
                const currentDay = new Date(sunday);
                currentDay.setDate(sunday.getDate() + i);
                
                const dateKey = createDateKey(currentDay);
                const isFocused = dateKey === focusedDateKey;
                
                timeline.dataset.dateKey = dateKey;

                const theDay = timeline.querySelector('.theday');
                if (theDay) {
                    theDay.textContent = `${dayNames[i]} ${currentDay.getMonth() + 1}.${currentDay.getDate()}`;
                    
                    // **[추가]** 포커스된 날짜에 클래스 적용 (CSS에서 윤곽선 처리)
                    if (isFocused) {
                        theDay.classList.add('focused-day');
                        timeline.classList.add('focused-timeline');
                        // **[요청 사항]** 포커스된 날짜를 selectedDateKey로 설정
                        selectedDateKey = dateKey; 
                    } else {
                        theDay.classList.remove('focused-day');
                        timeline.classList.remove('focused-timeline');
                    }
                }
                
                // **[추가]** 날짜 헤더 클릭 이벤트 (클릭 시 해당 날짜로 이동)
                theDay?.addEventListener('click', function(e) {
                     e.stopPropagation();
                     navigateToDate(currentDay);
                });
            });
            
            createTimeSlots(); 
            setupTimelineEvents(); 

            renderAllEvents();
            
            // **[추가]** Todo List 갱신
            renderTodo(); 
        }

        // **[추가]** 키보드 이벤트 리스너
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const newDate = new Date(focusedDate);
                newDate.setDate(focusedDate.getDate() - 1);
                navigateToDate(newDate);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const newDate = new Date(focusedDate);
                newDate.setDate(focusedDate.getDate() + 1);
                navigateToDate(newDate);
            }
        });

        function setupTimelineEvents() {
            // ... (기존 timeline 클릭 이벤트 유지) ...
            timelines.forEach((timeline) => {
                const slots = timeline.querySelectorAll('.time-slot'); 
                slots.forEach(slot => {
                    slot.addEventListener('click', function(e) {
                        e.stopPropagation(); 
                        if (this.querySelectorAll('.event-block').length === 0) { 
                            selectedDateKey = timeline.dataset.dateKey;
                            selectedHour = parseInt(this.dataset.hour);
                            editingEventId = null;
                            showModal();
                        }
                    });
                });
            });
        }
        
        // ... (showModal, setupEnterNavigation, saveBtn/deleteBtn 이벤트 핸들러 유지) ...
        // (편의상 여기서는 생략하고, 원본 스크립트의 해당 부분은 유지하면 됩니다.)
        // 모달 관련 함수와 렌더링 함수는 수정된 부분 외에는 기존 코드를 그대로 사용하세요.
        
        // ... (renderEvents, renderAllEvents 함수 유지) ...
        
        document.getElementById('prevWeek')?.addEventListener('click', function() {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            const newDate = new Date(focusedDate);
            newDate.setDate(focusedDate.getDate() - 7);
            navigateToDate(newDate);
        });

        document.getElementById('nextWeek')?.addEventListener('click', function() {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            const newDate = new Date(focusedDate);
            newDate.setDate(focusedDate.getDate() + 7);
            navigateToDate(newDate);
        });
                
        displayWeekDates(currentWeekStart);
    }

    //----------------------------------------------------------------------
    // 주의: 아래는 기존 스크립트에 있었던 모달 관련 함수들을 재작성한 것입니다. 
    //       실제 파일에는 이전에 제공했던 모든 코드가 포함되어야 합니다.
    //----------------------------------------------------------------------

    function showModal(event = null) {
        const modal = document.getElementById('eventModal');
        const titleInput = document.getElementById('eventTitle');
        const startHourInput = document.getElementById('startHour');
        const startMinuteInput = document.getElementById('startMinute');
        const endHourInput = document.getElementById('endHour');
        const endMinuteInput = document.getElementById('endMinute');
        const deleteBtn = document.getElementById('deleteBtn');
        const header = modal.querySelector('.modal-header');
        
        titleInput.autocomplete = 'off';
        
        if (event) {
            header.textContent = '일정 수정';
            titleInput.value = event.title;
            const [startH, startM] = event.startTime.split(':');
            const [endH, endM] = event.endTime.split(':');
            startHourInput.value = parseInt(startH);
            startMinuteInput.value = parseInt(startM);
            endHourInput.value = parseInt(endH);
            endMinuteInput.value = parseInt(endM);
            deleteBtn.style.display = 'block';
            editingEventId = event.id;
        } else {
            header.textContent = '일정 추가';
            titleInput.value = '';
            startHourInput.value = selectedHour !== null ? selectedHour : 9;
            startMinuteInput.value = 0;
            endHourInput.value = selectedHour !== null ? selectedHour + 1 : 10;
            endMinuteInput.value = 0;
            deleteBtn.style.display = 'none';
            editingEventId = null;
        }
        
        modal.style.display = 'block';
        titleInput.focus();
        
        setupEnterNavigation();
    }

    function setupEnterNavigation() {
        const inputs = [
            document.getElementById('eventTitle'),
            document.getElementById('startHour'),
            document.getElementById('startMinute'),
            document.getElementById('endHour'),
            document.getElementById('endMinute')
        ];
        
        inputs.forEach((input, index) => {
            input.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                        inputs[index + 1].select();
                    } else {
                        document.getElementById('saveBtn').click();
                    }
                }
            };
        });
        
        const numberInputs = inputs.slice(1);
        numberInputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.length > 2) {
                    this.value = this.value.slice(0, 2);
                }
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        });
    }

    document.getElementById('cancelBtn')?.addEventListener('click', function() {
        document.getElementById('eventModal').style.display = 'none';
    });

    document.getElementById('saveBtn')?.addEventListener('click', function() {
        const title = document.getElementById('eventTitle').value.trim();
        const startHour = parseInt(document.getElementById('startHour').value);
        const startMinute = parseInt(document.getElementById('startMinute').value);
        const endHour = parseInt(document.getElementById('endHour').value);
        const endMinute = parseInt(document.getElementById('endMinute').value);
        
        if (!title || isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) || selectedDateKey === null) {
            return;
        }
        
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;

        if (startTimeMinutes >= endTimeMinutes) {
            return;
        }
        
        const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        if (!events[selectedDateKey]) {
            events[selectedDateKey] = [];
        }
        
        if (editingEventId) {
            const eventIndex = events[selectedDateKey].findIndex(e => e.id === editingEventId);
            if (eventIndex !== -1) {
                events[selectedDateKey][eventIndex] = {
                    id: editingEventId,
                    title,
                    startTime,
                    endTime
                };
            }
        } else {
            events[selectedDateKey].push({
                id: Date.now(),
                title,
                startTime,
                endTime
            });
        }
        
        saveEvents();
        renderAllEvents();
        document.getElementById('eventModal').style.display = 'none';
    });

    document.getElementById('deleteBtn')?.addEventListener('click', function() {
        if (events[selectedDateKey]) {
            events[selectedDateKey] = events[selectedDateKey].filter(e => e.id !== editingEventId);
            saveEvents();
        }
        renderAllEvents();
        document.getElementById('eventModal').style.display = 'none';
    });

    function renderEvents(dateKey) {
        const timeline = Array.from(timelines).find(t => t.dataset.dateKey === dateKey);
        if (!timeline) return;

        const content = timeline.querySelector('.timeline-content');
        
        content.querySelectorAll('.event-block').forEach(block => block.remove());
        
        if (events[dateKey]) {
            events[dateKey].forEach(event => {
                const [startH, startM] = event.startTime.split(':').map(Number);
                const [endH, endM] = event.endTime.split(':').map(Number);
                
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                
                const totalMinutesInDay = 24 * 60;
                const topPercent = (startMinutes / totalMinutesInDay) * 100;
                const heightPercent = ((endMinutes - startMinutes) / totalMinutesInDay) * 100;
                
                const eventBlock = document.createElement('div');
                eventBlock.className = 'event-block';
                eventBlock.style.top = topPercent + '%';
                eventBlock.style.height = heightPercent + '%';
                eventBlock.title = `${event.startTime} - ${event.endTime}: ${event.title}`; 
                
                const eventTitle = document.createElement('span');
                eventTitle.textContent = event.title;
                eventBlock.appendChild(eventTitle);
                
                eventBlock.addEventListener('click', function(e) {
                    e.stopPropagation(); 
                    selectedDateKey = dateKey;
                    showModal(event);
                });
                
                content.appendChild(eventBlock);
            });
        }
    }

    function renderAllEvents() {
        timelines.forEach(timeline => {
            const dateKey = timeline.dataset.dateKey;
            if (dateKey) {
                renderEvents(dateKey);
            }
        });
    }

    // 주간 뷰 초기화
    if (timelines.length > 0) {
        displayWeekDates(currentWeekStart);
    }
});