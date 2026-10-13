const API =
    'http://localhost:3001/products';


let products = [];


// ELEMENTS

const productTable =
    document.querySelector('#product-table');

const productForm =
    document.querySelector('#product-form');

const adminSearch =
    document.querySelector('#admin-search');


const productCount =
    document.querySelector('#product-count');

const averagePrice =
    document.querySelector('#average-price');

const totalStock =
    document.querySelector('#total-stock');


const editModal =
    document.querySelector('#edit-modal');

const editClose =
    document.querySelector('#edit-close');

const saveProduct =
    document.querySelector('#save-product');


const notification =
    document.querySelector('#admin-notification');


let notificationTimer;


// =====================================
// GET
// =====================================

async function loadProducts() {

    try {

        const response =
            await fetch(API);


        if (!response.ok) {

            throw new Error(
                'Сервер қатесі'
            );

        }


        products =
            await response.json();


        renderProducts(products);

        updateStatistics();

    }

    catch (error) {

        showNotification(
            '❌ JSON Server жұмыс істемейді'
        );


        console.error(error);

    }

}


// =====================================
// TABLE
// =====================================

function renderProducts(list) {

    productTable.innerHTML = '';


    if (list.length === 0) {

        productTable.innerHTML = `

            <tr>

                <td colspan="6">
                    Тауар табылмады
                </td>

            </tr>

        `;

        return;

    }


    list.forEach(product => {

        const row =
            document.createElement('tr');


        row.innerHTML = `

            <td>

                <img
                    src="${product.image}"
                    class="product-thumb"
                    alt="${product.name}"
                >

            </td>


            <td>
                ${product.name}
            </td>


            <td class="price-cell">
                ${product.price} ₸
            </td>


            <td>
                ${product.stock} дана
            </td>


            <td>
                ${getCategoryName(
                    product.category
                )}
            </td>


            <td>

                <button
                    class="edit-button"
                >
                    ✏️
                </button>


                <button
                    class="delete-admin-button"
                >
                    🗑️
                </button>

            </td>

        `;


        row.querySelector(
            '.edit-button'
        ).addEventListener(
            'click',
            () => {

                openEdit(product);

            }
        );


        row.querySelector(
            '.delete-admin-button'
        ).addEventListener(
            'click',
            () => {

                deleteProduct(
                    product.id
                );

            }
        );


        productTable.appendChild(row);

    });

}


// =====================================
// CATEGORY NAME
// =====================================

function getCategoryName(category) {

    if (category === 'vegetables') {
        return '🥕 Көкөністер';
    }

    if (category === 'milk') {
        return '🥛 Сүт өнімдері';
    }

    if (category === 'honey') {
        return '🍯 Бал';
    }


    return '📦 Басқа';

}


// =====================================
// STATISTICS
// =====================================

function updateStatistics() {

    productCount.textContent =
        products.length;


    const totalPrice =
        products.reduce(
            (sum, product) =>
                sum + Number(product.price),
            0
        );


    const average =
        products.length > 0
            ? Math.round(
                totalPrice /
                products.length
            )
            : 0;


    averagePrice.textContent =
        average;


    const stock =
        products.reduce(
            (sum, product) =>
                sum + Number(product.stock),
            0
        );


    totalStock.textContent =
        stock;

}


// =====================================
// ADD PRODUCT — POST
// =====================================
productForm.addEventListener(
    'submit',
    async event => {

        event.preventDefault();


        const newProduct = {

            name:
                document.querySelector(
                    '#product-name'
                ).value.trim(),

            price:
                Number(
                    document.querySelector(
                        '#product-price'
                    ).value
                ),

            oldPrice:
                Number(
                    document.querySelector(
                        '#product-old-price'
                    ).value
                ) || 0,

            stock:
                Number(
                    document.querySelector(
                        '#product-stock'
                    ).value
                ),

            category:
                document.querySelector(
                    '#product-category'
                ).value,

            badge:
                document.querySelector(
                    '#product-badge'
                ).value.trim() || 'Жаңа',

            image:
                document.querySelector(
                    '#product-image'
                ).value.trim(),

            description:
                document.querySelector(
                    '#product-description'
                ).value.trim(),

            rating: 5.0,

            reviews: 0

        };


        try {

            const response =
                await fetch(
                    API,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify(
                                newProduct
                            )
                    }
                );


            if (!response.ok) {

                throw new Error(
                    'Тауар қосылмады'
                );

            }


            showNotification(
                '✅ Жаңа тауар қосылды!'
            );


            // FORM ТАЗАЛАУ

            productForm.reset();


            // КЕСТЕНІ ЖАҢАРТУ

            await loadProducts();

        }

        catch (error) {

            console.error(error);


            showNotification(
                '❌ Тауарды қосу кезінде қате'
            );

        }

    }
);


// =====================================
// DELETE PRODUCT — DELETE
// =====================================

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!product) {

        return;

    }


    const confirmed =
        confirm(
            `"${product.name}" тауарын өшіргіңіз келе ме?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {
                    method: 'DELETE'
                }
            );


        if (!response.ok) {

            throw new Error(
                'Тауар өшірілмеді'
            );

        }


        showNotification(
            '🗑️ Тауар өшірілді'
        );


        await loadProducts();

    }

    catch (error) {

        console.error(error);


        showNotification(
            '❌ Тауарды өшіру кезінде қате'
        );

    }

}


// =====================================
// OPEN EDIT WINDOW
// =====================================

function openEdit(product) {

    document.querySelector(
        '#edit-id'
    ).value =
        product.id;


    document.querySelector(
        '#edit-name'
    ).value =
        product.name;


    document.querySelector(
        '#edit-price'
    ).value =
        product.price;


    document.querySelector(
        '#edit-old-price'
    ).value =
        product.oldPrice || 0;


    document.querySelector(
        '#edit-stock'
    ).value =
        product.stock;


    document.querySelector(
        '#edit-description'
    ).value =
        product.description || '';


    editModal.classList.add(
        'active'
    );

}


// =====================================
// CLOSE EDIT
// =====================================

function closeEdit() {

    editModal.classList.remove(
        'active'
    );

}


editClose.addEventListener(
    'click',
    closeEdit
);


// ҚАРА ФОНДЫ БАСҚАНДА ЖАБУ

editModal.addEventListener(
    'click',
    event => {

        if (
            event.target ===
            editModal
        ) {

            closeEdit();

        }

    }
);


// =====================================
// SAVE PRODUCT — PATCH
// =====================================

saveProduct.addEventListener(
    'click',
    async () => {

        const id =
            document.querySelector(
                '#edit-id'
            ).value;


        const updatedProduct = {

            name:
                document.querySelector(
                    '#edit-name'
                ).value.trim(),

            price:
                Number(
                    document.querySelector(
                        '#edit-price'
                    ).value
                ),

            oldPrice:
                Number(
                    document.querySelector(
                        '#edit-old-price'
                    ).value
                ),

            stock:
                Number(
                    document.querySelector(
                        '#edit-stock'
                    ).value
                ),

            description:
                document.querySelector(
                    '#edit-description'
                ).value.trim()

        };


        if (
            updatedProduct.name === ''
        ) {

            showNotification(
                '⚠️ Тауар атауын енгізіңіз'
            );

            return;

        }


        try {

            const response =
                await fetch(
                    `${API}/${id}`,
                    {
                        method: 'PATCH',

                        headers: {

                            'Content-Type':
                                'application/json'

                        },

                        body:
                            JSON.stringify(
                                updatedProduct
                            )
                    }
                );


            if (!response.ok) {

                throw new Error(
                    'Өзгеріс сақталмады'
                );

            }


            closeEdit();


            showNotification(
                '✅ Өзгерістер сақталды'
            );


            await loadProducts();

        }

        catch (error) {

            console.error(error);


            showNotification(
                '❌ Өзгерісті сақтау кезінде қате'
            );

        }

    }
);


// =====================================
// ADMIN SEARCH
// =====================================

adminSearch.addEventListener(
    'input',
    () => {

        const text =
            adminSearch.value
                .toLowerCase()
                .trim();


        const result =
            products.filter(
                product =>

                    product.name
                        .toLowerCase()
                        .includes(text)

            );


        renderProducts(
            result
        );

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
            2500
        );

}


// =====================================
// ESC
// =====================================

document.addEventListener(
    'keydown',
    event => {

        if (
            event.key === 'Escape'
        ) {

            closeEdit();

        }

    }
);


// =====================================
// START
// =====================================

loadProducts();