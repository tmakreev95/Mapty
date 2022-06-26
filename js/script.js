'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllWorkouts = document.querySelector('#delete_all_workkouts');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min        
    }

    _setDescription() {
        this.description = `${this.type} on ${months[this.date.getMonth()]} ${this.date.getDate()} ${this.date.getFullYear()}`;
    }
}

class Running extends Workout {
    constructor(coords, distance, duration, cadance) {
        super(coords, distance, duration);
        this.type = 'Running';
        this.cadance = cadance;
        this._setDescription();
        this.calculatePace();
    }

    calculatePace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }

}

class Cycling extends Workout {
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.type = 'Cycling';
        this.elevationGain = elevationGain;
        this._setDescription();
        this.calculateSpeed();
    }

    calculateSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// Application Architecture
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Get local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        deleteAllWorkouts.addEventListener('click', this._deleteAllWorkouts.bind(this));
    }

    _getPosition() {
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            function () {
                alert('Could not get your position');
            }
        );
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];

        // Leaflet
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        });
    }

    _showForm(mapEv) {
        this.#mapEvent = mapEv;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid'
        }, 1000);
    }

    _toggleElevationField() {
        inputElevation
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
        inputCadence
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);
        e.preventDefault();

        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        const { lat, lng } = this.#mapEvent.latlng;

        let workout;

        if (type === 'running') {
            const cadance = Number(inputCadence.value);

            if (!validInputs(distance, duration, cadance) || !allPositive(distance, duration, cadance)) {
                return alert('Inputs have to be positive numbers!');
            }

            workout = new Running([lat, lng], distance, duration, cadance);
            this.#workouts.push(workout);
        }

        if (type === 'cycling') {
            const elevation = Number(inputElevation.value);

            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have to be positive numbers!');
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);
            this.#workouts.push(workout);
        }

        this._renderWorkoutMarker(workout);
        this._setDescription;
        this._renderWorkout(workout);

        // Clear input fields
        this._hideForm();

        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords).addTo(this.#map);

        marker.bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type.toLowerCase()}-popup`
        })).setPopupContent(`${workout.description}`).openPopup();
    }

    _renderWorkout(workout) {
        const workoutType = workout.type;

        let html = `
            <li class="workout workout--${workoutType.toLowerCase()}" data-id="${workout.id}">                
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workoutType.toLowerCase() === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>`
            ;

        if (workoutType === 'Running') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadance}</span>
                    <span class="workout__unit">spm</span>
                </div>
                <span class="workout__operation-delete"><i class="fa fa-trash" aria-hidden="true"></i></span>
                </li>`
                ;
        }

        if (workoutType === 'Cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
                <span class="workout__operation-delete"><i class="fa fa-trash" aria-hidden="true"></i></span>
                </li>`;
        }


        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        const workouts = [];

        if (!data) return;

        data.forEach(workout => {
            if (workout.type === "Running") {
                let temp = new Running(
                    workout.coords,
                    workout.distance,
                    workout.duration,
                    workout.type,
                    workout.cadance
                );

                temp.date = workout.date;
                temp.id = workout.id;

                workouts.push(temp);
            }

            if (workout.type === "Cycling") {
                let temp = new Cycling(
                    workout.coords,
                    workout.distance,
                    workout.duration,
                    workout.type,
                    workout.elevationGain
                );

                temp.date = workout.date;
                temp.id = workout.id;

                workouts.push(temp);
            }

        });

        this.#workouts = workouts;

        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

    _deleteWorkoutById(id) {
        const workout = this.#workouts.find(workout => workout.id === id);
        console.log(workout);

        let message = `Are you sure you want to delete '${workout.description}'?`;

        if (confirm(message) == true) {
            this.#workouts = this.#workouts.filter(workout => workout.id !== id);
            localStorage.setItem('workouts', JSON.stringify(this.#workouts));
            this._removeLayerFromMap(workout);

            let list = document.querySelector('.workouts');

            for (let i = 1; i < list.children.length; i++) {
                if (list.children.item(i).dataset.id) {
                    list.removeChild(list.children.item(i));
                    this._deleteWorkoutNodes();
                } else {
                    break;
                }
            }
        }
    }

    _deleteWorkoutNodes() {
        let list = document.querySelector('.workouts');
        for (let i = 1; i < list.children.length; i++) {
            if (list.children.item(i).dataset.id) {
                list.removeChild(list.children.item(i));
                this._deleteWorkoutNodes();
            } else {
                break;
            }
        }
    }

    _removeLayerFromMap(workout) {
        // Removing map layer
        this.#map.eachLayer(function (layer) {
            if (layer._latlng && layer._latlng.lat === workout.coords[0] && layer._latlng.lng === workout.coords[1]) {
                layer.remove();
            }
        });
    }

    _deleteAllWorkouts() {
        let message = "Are you sure you want to delete all workouts data?";
        if (confirm(message) == true) {
            this.#workouts.forEach(workout => {
                this._removeLayerFromMap(workout);
            });

            // Removing data for workouts
            this.#workouts.splice(0, this.#workouts.length);
            localStorage.removeItem('workouts');

            // Removing nodes in FE
            this._deleteWorkoutNodes();
        }
    }
}

const app = new App();

// TODO - Fix move to pop-up and dymanic attaching event handlers on newly added elements
const deleteWorkout = document.querySelectorAll('.workout__operation-delete');

for (let deleteWorkoutNode of deleteWorkout) {
    deleteWorkoutNode.addEventListener('click', function (event) {
        const workoutId = event.target.parentElement.parentElement.dataset.id;
        app._deleteWorkoutById(workoutId);
    })
}