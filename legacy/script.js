// =====================================
// ELEMENTS
// =====================================

const catalog =
    document.querySelector('.catalog');

const cartCountEl =
    document.querySelector('#cart-count');

const cartTotalEl =
    document.querySelector('#cart-total');

const searchInput =
    document.querySelector('#search');

const sortSelect =
    document.querySelector('#sort');

const loading =
    document.querySelector('#loading');


const cartPanel =
    document.querySelector('#cart-panel');

const cartItems =
    document.querySelector('#cart-items');

const overlay =
    document.querySelector('#overlay');

const openCartButton =
    document.querySelector('#open-cart');

const closeCartButton =
    document.querySelector('#close-cart');

const orderButton =
    document.querySelector('#order-button');


const categoryButtons =
    document.querySelectorAll('.category-btn');


const productModal =
    document.querySelector('#product-modal');

const modalBody =
    document.querySelector('#modal-body');

const modalClose =
    document.querySelector('#modal-close');

const notification =
    document.querySelector('#notification');

const checkoutModal =
    document.querySelector('#checkout-modal');

const checkoutClose =
    document.querySelector('#checkout-close');

const customerName =
    document.querySelector('#customer-name');

const customerPhone =
    document.querySelector('#customer-phone');

const customerAddress =
    document.querySelector('#customer-address');

const promoCode =
    document.querySelector('#promo-code');

const applyPromoButton =
    document.querySelector('#apply-promo');

const promoMessage =
    document.querySelector('#promo-message');

const checkoutSubtotal =
    document.querySelector('#checkout-subtotal');

const deliveryPriceEl =
    document.querySelector('#delivery-price');

const discountPriceEl =
    document.querySelector('#discount-price');

const checkoutTotal =
    document.querySelector('#checkout-total');

const confirmOrder =
    document.querySelector('#confirm-order');


let promoApplied = false;
// =====================================
// VARIABLES
// =====================================

let products = [];

let cart = [];

let favorites = [];

let currentCategory = 'all';

let notificationTimer;


// =====================================
// LOAD PRODUCTS
// =====================================

async function loadProducts() {

    try {

        loading.style.display = 'block';


        const response =
            await fetch(
                'http://localhost:3001/products'
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        products =
            await response.json();


        loading.style.display = 'none';


        updateProducts();

    }

    catch (error) {

        loading.textContent =
            '❌ Тауарлар жүктелмеді. Серверді тексеріңіз.';


        console.error(error);

    }

}


// =====================================
// RENDER PRODUCTS
// =====================================

function renderProducts(list) {

    catalog.innerHTML = '';


    if (list.length === 0) {

        catalog.innerHTML = `

            <p class="empty">
                Тауар табылмады 😔
            </p>

        `;

        return;

    }


    list.forEach(product => {

        const card =
            document.createElement(
                'article'
            );


        card.className = 'card';


        const isFavorite =
            favorites.includes(
                String(product.id)
            );


        let stockClass =
            'in-stock';


        if (product.stock === 0) {

            stockClass =
                'out-stock';

        }

        else if (product.stock <= 5) {

            stockClass =
                'low-stock';

        }


        card.innerHTML = `

            <div class="product-image">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                >


                <span class="badge">

                    ${product.badge}

                </span>


                <button
                    class="favorite-btn
                    ${isFavorite ? 'active' : ''}"
                >

                    ${isFavorite ? '❤️' : '🤍'}

                </button>

            </div>


            <h3 class="product-name">

                ${product.name}

            </h3>


            <div class="rating">

                ⭐ ${product.rating}

                <span class="review-count">

                    (${product.reviews} пікір)

                </span>

            </div>


            <div class="stock ${stockClass}">

                ${
                    product.stock === 0
                        ? '❌ Қоймада жоқ'
                        : `📦 Қоймада: ${product.stock} дана`
                }

            </div>


            <div class="prices">

                <span class="old-price">

                    ${product.oldPrice} ₸

                </span>


                <span class="new-price">

                    ${product.price} ₸

                </span>

            </div>


            <button
                class="add-cart-btn"
                ${
                    product.stock === 0
                        ? 'disabled'
                        : ''
                }
            >

                ${
                    product.stock === 0
                        ? 'Қоймада жоқ'
                        : '🛒 Себетке'
                }

            </button>

        `;


        // ❤️ FAVORITE

        card
            .querySelector(
                '.favorite-btn'
            )
            .addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    toggleFavorite(
                        product.id
                    );

                }
            );


        // 🛒 CART BUTTON

        const addButton =
            card.querySelector(
                '.add-cart-btn'
            );


        if (product.stock > 0) {

            addButton.addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    addToCart(
                        product
                    );

                }
            );

        }


        // ==================================
        // КАРТОЧКАНЫ БАСҚАНДА ҒАНА POPUP
        // ==================================

        card.addEventListener(
            'click',
            event => {

                if (
                    event.target.closest(
                        '.favorite-btn'
                    ) ||

                    event.target.closest(
                        '.add-cart-btn'
                    )
                ) {

                    return;

                }


                openProductModal(
                    product
                );

            }
        );


        catalog.appendChild(
            card
        );

    });

}


// =====================================
// FAVORITES
// =====================================

function toggleFavorite(id) {

    const stringId =
        String(id);


    if (
        favorites.includes(
            stringId
        )
    ) {

        favorites =
            favorites.filter(
                favoriteId =>
                    favoriteId !==
                    stringId
            );


        showNotification(
            '🤍 Таңдаулылардан өшірілді'
        );

    }

    else {

        favorites.push(
            stringId
        );


        showNotification(
            '❤️ Таңдаулыларға қосылды'
        );

    }


    updateProducts();

}


// =====================================
// CATEGORY
// =====================================

categoryButtons.forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                categoryButtons.forEach(
                    btn => {

                        btn.classList.remove(
                            'active'
                        );

                    }
                );


                button.classList.add(
                    'active'
                );


                currentCategory =
                    button.dataset.category;


                updateProducts();

            }
        );

    }
);


// =====================================
// SEARCH
// =====================================

searchInput.addEventListener(
    'input',
    updateProducts
);


// =====================================
// SORT
// =====================================

sortSelect.addEventListener(
    'change',
    updateProducts
);


// =====================================
// FILTER
// =====================================

function updateProducts() {

    const searchText =
        searchInput.value
            .toLowerCase()
            .trim();


    let result =
        products.filter(
            product =>

                product.name
                    .toLowerCase()
                    .includes(
                        searchText
                    )

        );


    // FAVORITES

    if (
        currentCategory ===
        'favorites'
    ) {

        result =
            result.filter(
                product =>

                    favorites.includes(
                        String(
                            product.id
                        )
                    )

            );

    }


    // OTHER CATEGORY

    else if (
        currentCategory !==
        'all'
    ) {

        result =
            result.filter(
                product =>

                    product.category ===
                    currentCategory

            );

    }


    // LOW PRICE

    if (
        sortSelect.value ===
        'low'
    ) {

        result.sort(
            (a, b) =>

                Number(a.price) -
                Number(b.price)

        );

    }


    // HIGH PRICE

    if (
        sortSelect.value ===
        'high'
    ) {

        result.sort(
            (a, b) =>

                Number(b.price) -
                Number(a.price)

        );

    }


    renderProducts(
        result
    );

}


// =====================================
// ADD TO CART
// =====================================

function addToCart(product) {

    const existing =
        cart.find(
            item =>

                String(item.id) ===
                String(product.id)

        );


    const currentQuantity =
        existing
            ? existing.quantity
            : 0;


    if (
        currentQuantity >=
        product.stock
    ) {

        showNotification(
            '⚠️ Қоймада бұдан артық тауар жоқ'
        );

        return;

    }


    if (existing) {

        existing.quantity++;

    }

    else {

        cart.push({

            ...product,

            quantity: 1

        });

    }


    updateCart();


    showNotification(
        `✅ ${product.name} себетке қосылды`
    );

}


// =====================================
// UPDATE CART
// =====================================

function updateCart() {

    cartItems.innerHTML = '';


    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <h3>🛒</h3>

                <p>
                    Себет бос
                </p>

            </div>

        `;

    }


    cart.forEach(item => {

        const div =
            document.createElement(
                'div'
            );


        div.className =
            'cart-item';


        div.innerHTML = `

            <img
                src="${item.image}"
                alt="${item.name}"
            >


            <div class="cart-item-info">

                <h4>
                    ${item.name}
                </h4>


                <div class="cart-item-price">

                    ${item.price} ₸

                </div>


                <div class="quantity">

                    <button class="minus">
                        −
                    </button>


                    <span>
                        ${item.quantity}
                    </span>


                    <button class="plus">
                        +
                    </button>

                </div>

            </div>


            <button class="delete-button">

                🗑️

            </button>

        `;


        div.querySelector(
            '.minus'
        ).addEventListener(
            'click',
            () => {

                decrease(
                    item.id
                );

            }
        );


        div.querySelector(
            '.plus'
        ).addEventListener(
            'click',
            () => {

                increase(
                    item.id
                );

            }
        );


        div.querySelector(
            '.delete-button'
        ).addEventListener(
            'click',
            () => {

                removeItem(
                    item.id
                );

            }
        );


        cartItems.appendChild(
            div
        );

    });


    const totalCount =
        cart.reduce(
            (sum, item) =>

                sum +
                item.quantity,

            0
        );


    const totalPrice =
        cart.reduce(
            (sum, item) =>

                sum +
                Number(item.price) *
                item.quantity,

            0
        );


    cartCountEl.textContent =
        totalCount;


    cartTotalEl.textContent =
        totalPrice;

}


// =====================================
// PLUS
// =====================================

function increase(id) {

    const item =
        cart.find(
            product =>

                String(product.id) ===
                String(id)

        );


    if (!item) {

        return;

    }


    if (
        item.quantity >=
        item.stock
    ) {

        showNotification(
            '⚠️ Қоймада жеткілікті тауар жоқ'
        );

        return;

    }


    item.quantity++;


    updateCart();

}


// =====================================
// MINUS
// =====================================

function decrease(id) {

    const item =
        cart.find(
            product =>

                String(product.id) ===
                String(id)

        );


    if (!item) {

        return;

    }


    item.quantity--;


    if (
        item.quantity <= 0
    ) {

        removeItem(id);

        return;

    }


    updateCart();

}


// =====================================
// DELETE
// =====================================

function removeItem(id) {

    cart =
        cart.filter(
            product =>

                String(product.id) !==
                String(id)

        );


    updateCart();


    showNotification(
        '🗑️ Тауар себеттен өшірілді'
    );

}


// =====================================
// OPEN CART
// =====================================

openCartButton.addEventListener(
    'click',
    () => {

        cartPanel.classList.add(
            'active'
        );


        overlay.classList.add(
            'active'
        );

    }
);


// =====================================
// CLOSE CART
// =====================================

function closeCart() {

    cartPanel.classList.remove(
        'active'
    );


    overlay.classList.remove(
        'active'
    );

}


closeCartButton.addEventListener(
    'click',
    closeCart
);


overlay.addEventListener(
    'click',
    closeCart
);


// =====================================
// PRODUCT POPUP
// =====================================

function openProductModal(product) {

    modalBody.innerHTML = `

        <div class="modal-product">

            <img
                src="${product.image}"
                alt="${product.name}"
            >


            <div class="modal-info">

                <h2>
                    ${product.name}
                </h2>


                <div class="modal-rating">

                    ⭐ ${product.rating}

                    (${product.reviews} пікір)

                </div>


                <p class="modal-description">

                    ${product.description}

                </p>


                <p class="${
                    product.stock === 0
                        ? 'out-stock'
                        : product.stock <= 5
                            ? 'low-stock'
                            : 'in-stock'
                }">

                    ${
                        product.stock === 0
                            ? '❌ Қоймада жоқ'
                            : `📦 Қоймада: ${product.stock} дана`                    }

                </p>


                <div class="modal-price">

                    ${product.price} ₸

                    <span class="modal-old-price">

                        ${product.oldPrice} ₸

                    </span>

                </div>


                <button
                    class="modal-cart-btn"
                    ${
                        product.stock === 0
                            ? 'disabled'
                            : ''
                    }
                >

                    ${
                        product.stock === 0
                            ? 'Қоймада жоқ'
                            : '🛒 Себетке қосу'
                    }

                </button>

            </div>

        </div>

    `;


    // POPUP-ТАҒЫ "СЕБЕТКЕ ҚОСУ"

    const modalCartButton =
        modalBody.querySelector(
            '.modal-cart-btn'
        );


    if (product.stock > 0) {

        modalCartButton.addEventListener(
            'click',
            event => {

                event.stopPropagation();

                addToCart(product);

            }
        );

    }


    // POPUP АШУ

    productModal.classList.add(
        'active'
    );

}


// =====================================
// CLOSE PRODUCT POPUP
// =====================================

function closeProductModal() {

    productModal.classList.remove(
        'active'
    );

}


// X БАТЫРМАСЫ

modalClose.addEventListener(
    'click',
    closeProductModal
);


// ҚАРА ФОНДЫ БАСҚАНДА ЖАБУ

productModal.addEventListener(
    'click',
    event => {

        if (
            event.target === productModal
        ) {

            closeProductModal();

        }

    }
);


// =====================================
// NOTIFICATION
// =====================================

function showNotification(message) {

    notification.textContent =
        message;


    notification.classList.add(
        'show'
    );


    clearTimeout(
        notificationTimer
    );


    notificationTimer =
        setTimeout(
            () => {

                notification.classList.remove(
                    'show'
                );

            },
            2000
        );

}


// =====================================
// ORDER
// =====================================

// =====================================
// OPEN CHECKOUT
// =====================================

orderButton.addEventListener(
    'click',
    () => {

        if (cart.length === 0) {

            showNotification(
                '⚠️ Себет бос!'
            );

            return;
        }


        closeCart();

        promoApplied = false;

        promoCode.value = '';

        promoMessage.textContent = '';


        updateCheckout();


        checkoutModal.classList.add(
            'active'
        );

    }
);


// =====================================
// CLOSE CHECKOUT
// =====================================

function closeCheckout() {

    checkoutModal.classList.remove(
        'active'
    );

}


checkoutClose.addEventListener(
    'click',
    closeCheckout
);


checkoutModal.addEventListener(
    'click',
    event => {

        if (
            event.target === checkoutModal
        ) {

            closeCheckout();

        }

    }
);


// =====================================
// CHECKOUT CALCULATION
// =====================================

function updateCheckout() {

    const subtotal =
        cart.reduce(
            (sum, item) =>

                sum +
                Number(item.price) *
                item.quantity,

            0
        );


    const delivery =
        document.querySelector(
            'input[name="delivery"]:checked'
        ).value;


    // КУРЬЕР = 1000 ₸
    // 10000 ₸ ЖОҒАРЫ БОЛСА ТЕГІН

    let deliveryPrice = 0;


    if (
        delivery === 'courier' &&
        subtotal < 10000
    ) {

        deliveryPrice = 1000;

    }


    // PROMO AGRO10 = 10%

    let discount = 0;


    if (promoApplied) {

        discount =
            Math.round(
                subtotal * 0.10
            );

    }


    const total =
        subtotal +
        deliveryPrice -
        discount;


    checkoutSubtotal.textContent =
        subtotal;


    deliveryPriceEl.textContent =
        deliveryPrice;


    discountPriceEl.textContent =
        discount;


    checkoutTotal.textContent =
        total;

}


// =====================================
// DELIVERY CHANGE
// =====================================

document
    .querySelectorAll(
        'input[name="delivery"]'
    )
    .forEach(
        radio => {

            radio.addEventListener(
                'change',
                updateCheckout
            );

        }
    );


// =====================================
// PROMOCODE
// =====================================

applyPromoButton.addEventListener(
    'click',
    () => {

        const code =
            promoCode.value
                .trim()
                .toUpperCase();


        if (code === 'AGRO10') {

            promoApplied = true;


            promoMessage.textContent =
                '✅ AGRO10: 10% жеңілдік қолданылды';


            promoMessage.style.color =
                '#2e7d32';

        }

        else {

            promoApplied = false;


            promoMessage.textContent =
                '❌ Промокод дұрыс емес';


            promoMessage.style.color =
                '#d32f2f';

        }


        updateCheckout();

    }
);


// =====================================
// CONFIRM ORDER
// =====================================

confirmOrder.addEventListener(
    'click',
    () => {

        const name =
            customerName.value.trim();


        const phone =
            customerPhone.value.trim();


        const address =
            customerAddress.value.trim();


        if (
            name === '' ||
            phone === '' ||
            address === ''
        ) {

            showNotification(
                '⚠️ Барлық мәліметті толтырыңыз'
            );

            return;
        }


        const payment =
            document.querySelector(
                'input[name="payment"]:checked'
            ).value;


        const total =
            checkoutTotal.textContent;


        const orderNumber =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        closeCheckout();


        showNotification(
            `✅ №${orderNumber} тапсырыс қабылданды! ${total} ₸ • ${payment}`
        );


        // СЕБЕТТІ ТАЗАЛАУ

        cart = [];

        updateCart();


        // ФОРМАНЫ ТАЗАЛАУ

        customerName.value = '';

        customerPhone.value = '';

        customerAddress.value = '';

        promoCode.value = '';

        promoMessage.textContent = '';

        promoApplied = false;

    }
);


        // ЖАЛПЫ СОМАНЫ ЕСЕПТЕУ

        const totalPrice =
            cart.reduce(
                (sum, item) =>

                    sum +
                    Number(item.price) *
                    item.quantity,

                0
            );


        // ТАПСЫРЫС НӨМІРІ

        const orderNumber =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        showNotification(
            `✅ Тапсырыс №${orderNumber} қабылданды! Жалпы: ${totalPrice} ₸`
        );


        // СЕБЕТТІ ТАЗАЛАУ

        cart = [];


        updateCart();


        // 1 СЕКУНДТАН КЕЙІН СЕБЕТТІ ЖАБУ

        setTimeout(
            () => {

                closeCart();

            },
            1000
        );

    


// =====================================
// ESC БАСҚАНДА ЖАБУ
// =====================================

document.addEventListener(
    'keydown',
    event => {

       if (event.key === 'Escape') {

    closeCart();

    closeProductModal();

    closeCheckout();

}

    }
);


// =====================================
// START
// =====================================

updateCart();

loadProducts();