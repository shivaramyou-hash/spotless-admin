// Функція для розрахунку ціни
function calculatePrice() {
    const propertyTypeRadio = document.querySelector('input[name="property"]:checked');
    const cleaningRadio = document.querySelector('input[name="cleaning"]:checked');
    const areaSlider = document.getElementById('area');
    const bedroomsCount = document.getElementById('bedrooms-count');
    const bathroomsCount = document.getElementById('bathrooms-count');

    if (!propertyTypeRadio || !cleaningRadio || !areaSlider || !bedroomsCount || !bathroomsCount) {
        return "0.00";
    }

    let propertyType = propertyTypeRadio.value;
    let basePrice = parseFloat(cleaningRadio.dataset[propertyType]);

    const area = parseInt(areaSlider.value);
    if (area > 30) {
        basePrice += (area - 30) * 5;
    }

    const bedrooms = parseInt(bedroomsCount.textContent);
    const bathrooms = parseInt(bathroomsCount.textContent);
    basePrice += (bedrooms - 1) * 20 + (bathrooms - 1) * 20;

    document.querySelectorAll('.mil-additional-service').forEach(service => {
        if (service.checked) {
            basePrice += parseFloat(service.value);
        }
    });

    return basePrice.toFixed(2);
}

// Оновлення загальної ціни на сторінці
function updateTotalPrice() {
    const totalPriceElement = document.getElementById('total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = calculatePrice();
    }
}

// Ініціалізація калькулятора
function initializeCalculator() {
    const cleaningRadios = document.querySelectorAll('input[name="cleaning"]');
    const propertyRadios = document.querySelectorAll('input[name="property"]');
    const areaSlider = document.getElementById('area');
    const areaValue = document.getElementById('area-value');
    const bedroomsButtons = document.querySelectorAll('.mil-bedrooms button');
    const bathroomsButtons = document.querySelectorAll('.mil-bathrooms button');
    const additionalServices = document.querySelectorAll('.mil-additional-service');

    if (cleaningRadios) {
        cleaningRadios.forEach(radio => {
            radio.addEventListener('change', updateTotalPrice);
        });
    }

    if (propertyRadios) {
        propertyRadios.forEach(radio => {
            radio.addEventListener('change', updateTotalPrice);
        });
    }

    if (areaSlider && areaValue) {
        areaSlider.addEventListener('input', () => {
            areaValue.textContent = `${areaSlider.value}m²`;
            updateTotalPrice();
        });
    }

    function updateRoomCount(type, change) {
        const countElement = document.getElementById(`${type}-count`);
        if (!countElement) return;

        let count = parseInt(countElement.textContent);
        if (type === 'bedrooms') {
            count = Math.min(6, Math.max(1, count + change));
        } else if (type === 'bathrooms') {
            count = Math.min(3, Math.max(1, count + change));
        }

        countElement.textContent = count;
        updateTotalPrice();
    }

    if (bedroomsButtons) {
        bedroomsButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const change = button.textContent === '+' ? 1 : -1;
                updateRoomCount('bedrooms', change);
            });
        });
    }

    if (bathroomsButtons) {
        bathroomsButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const change = button.textContent === '+' ? 1 : -1;
                updateRoomCount('bathrooms', change);
            });
        });
    }

    if (additionalServices) {
        additionalServices.forEach(service => {
            service.addEventListener('change', updateTotalPrice);
        });
    }

    updateTotalPrice();

    document.querySelectorAll('.mil-additional-service').forEach(checkbox => {
        const container = checkbox.closest('.mil-custom-checkbox');
        if (checkbox.checked && container) {
            container.classList.add('mil-checked');
        }

        checkbox.addEventListener('change', function () {
            const container = this.closest('.mil-custom-checkbox');
            if (container) {
                if (this.checked) {
                    container.classList.add('mil-checked');
                } else {
                    container.classList.remove('mil-checked');
                }
            }
        });
    });
}

// Запуск калькулятора після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('total-price')) {
        initializeCalculator();
    }
});

// Реініціалізація після переходів Swup
document.addEventListener("swup:contentReplaced", function () {
    if (document.getElementById('total-price')) {
        initializeCalculator();
    }
});
