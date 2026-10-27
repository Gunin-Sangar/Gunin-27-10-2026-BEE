// ================= 1. DATA =================

// coupon codes. "percent" = % off, "flat" = fixed amount off
const coupons = {
  LIFT10:  { type: "percent", value: 10 },
  FLAT5:   { type: "flat",    value: 5 }
};

let products = [];       // all products
let cart = {};           // { productId: quantity }  example: { 1: 2, 4: 1 }
let myCoupon = null;     // the coupon the user applied (or null)


// ================= 2. LOAD PRODUCTS =================

// left side = API category name, right side = the name shown in our shop
const categoryNames = {
  "groceries":          "Nutrition",
  "sports-accessories": "Gear",
  "mens-shirts":        "Apparel",
  "mens-shoes":         "Footwear"
};

// from the groceries, keep only gym foods
const gymFoods = ["protein", "eggs", "chicken", "milk", "rice", "fish", "beef", "honey"];

function isGymFood(title) {
  title = title.toLowerCase();
  for (const word of gymFoods) {
    if (title.includes(word)) return true;
  }
  return false;
}

// products from a free practice API called DummyJSON
async function loadProducts() {
  const list = [];

  // ask the API once for each category, one after the other
  for (const slug in categoryNames) {
    const response = await fetch("https://dummyjson.com/products/category/" + slug + "?select=title,price,thumbnail");
    const data = await response.json();

    data.products.forEach(function (p) {
      // skips groceries that are not gym food
      if (slug === "groceries" && !isGymFood(p.title)) return;

      list.push(
        { 
          id: p.id, 
          name: p.title, 
          category: categoryNames[slug], 
          price: p.price, 
          image: p.thumbnail
        }
      );
    });
  }

  return list;
}

// fill the category dropdown from the products
function fillCategories() {
  const names = [];
  products.forEach(function (p) {
    if (!names.includes(p.category)){
      names.push(p.category);
    }
  });

  names.forEach(function (name) {
    get("categoryBox").innerHTML += `<option value="${name}">${name}</option>`;
  });
}


// ================= 3. SMALL HELPERS =================

// shortcut so we don't type document.getElementById every time
function get(id) {
  return document.getElementById(id);
}

// 12.5 -> $12.50
function showMoney(number) {
  return "$" + number.toFixed(2);
}

// find one product by its id
function findProduct(id) {
  return products.find(function (p) {
    return p.id === Number(id);
  });
}


// ================= 4. FILTER AND SORT =================

function getFilteredProducts() {
  const searchText = get("searchBox").value.toLowerCase();
  const category = get("categoryBox").value;
  const sortType = get("sortBox").value;

  // filter: keep only products that match the search AND the category
  let list = products.filter(function (p) {
    const nameMatches = p.name.toLowerCase().includes(searchText);
    const categoryMatches = category === "all" || p.category === category;
    return nameMatches && categoryMatches;
  });

  // sort
  if (sortType === "low")  list.sort(function (a, b) { return a.price - b.price; });
  if (sortType === "high") list.sort(function (a, b) { return b.price - a.price; });
  if (sortType === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });

  return list;
}


// ================= 5. CART MATH =================

function getTotal() {
  let subtotal = 0;
  for (const id in cart) {
    subtotal = subtotal + findProduct(id).price * cart[id];
  }

  let discount = 0;
  if (myCoupon) {
    if (myCoupon.type === "percent") {
      discount = subtotal * myCoupon.value / 100;
    } else {
      // flat: never take off more than the subtotal
      discount = Math.min(myCoupon.value, subtotal);
    }
  }

  return { subtotal: subtotal, discount: discount, total: subtotal - discount };
}


// ================= 6. SHOW EVERYTHING ON SCREEN =================

function showProducts() {
  const list = getFilteredProducts();

  if (list.length === 0) {
    get("productList").innerHTML = "<p class='small'>No products found. Try another search or category.</p>";
    return;
  }

  let html = "";
  list.forEach(function (p) {
    html += `
      <div class="product">
        <img src="${p.image}" alt="${p.name}">
        <h3>${p.name}</h3>
        <div class="small">${p.category}</div>
        <div class="price">${showMoney(p.price)}</div>
        <button data-action="plus" data-id="${p.id}">Add to cart</button>
      </div>`;
  });
  get("productList").innerHTML = html;
}

function showCart() {
  const ids = Object.keys(cart);

  if (ids.length === 0) {
    get("cartList").innerHTML = "<p class='small'>Your cart is empty. Add something from the list.</p>";
  } else {
    let html = "";
    ids.forEach(function (id) {
      const p = findProduct(id);
      html += `
        <div class="cartItem">
          <div>${p.name}<div class="small">${showMoney(p.price)} each</div></div>
          <div class="qty">
            <button data-action="minus" data-id="${id}">−</button>
            ${cart[id]}
            <button data-action="plus" data-id="${id}">+</button>
          </div>
          <div>${showMoney(p.price * cart[id])}</div>
          <button data-action="remove" data-id="${id}">✕</button>
        </div>`;
    });
    get("cartList").innerHTML = html;
  }

  // totals
  const money = getTotal();
  get("subtotal").textContent = showMoney(money.subtotal);
  get("discount").textContent = "−" + showMoney(money.discount);
  get("total").textContent = showMoney(money.total);

  // number in the top bar = all quantities added up
  let count = 0;
  for (const id in cart) {
    count = count + cart[id];
  }
  get("cartCount").textContent = "Cart (" + count + ")";
}

// the golden rule: change the data first, then call showAll()
function showAll() {
  showProducts();
  showCart();
}


// ================= 7. ACTIONS =================

function changeQuantity(id, change) {
  if (!cart[id]) cart[id] = 0;     // first time adding this item
  cart[id] = cart[id] + change;

  if (cart[id] <= 0) delete cart[id];   // quantity 0 means remove it
  showAll();
}

function removeItem(id) {
  delete cart[id];
  showAll();
}

function applyCoupon() {
  const code = get("couponBox").value.trim().toUpperCase();

  if (coupons[code]) {
    myCoupon = coupons[code];
    get("message").textContent = "Coupon " + code + " applied.";
  } else {
    myCoupon = null;
    get("message").textContent = "Invalid code. Try LIFT10 or FLAT5.";
  }
  showAll();
}


// ================= 8. EVENTS =================

// one listener for ALL the +, -, remove and add buttons
document.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "plus")   changeQuantity(id, 1);
  if (action === "minus")  changeQuantity(id, -1);
  if (action === "remove") removeItem(id);
});

// redraw when search, category or sort changes
get("searchBox").addEventListener("input", showAll);
get("categoryBox").addEventListener("input", showAll);
get("sortBox").addEventListener("input", showAll);

get("couponBtn").addEventListener("click", applyCoupon);

get("checkoutBtn").addEventListener("click", function () {
  if (Object.keys(cart).length === 0) {
    get("message").textContent = "Add at least one item first.";
    return;
  }
  get("checkoutForm").style.display = "block";
});

get("checkoutForm").addEventListener("submit", function (event) {
  event.preventDefault();   // stop the page from reloading

  const money = getTotal();
  alert("Thanks " + get("nameBox").value + "! Your order of " + showMoney(money.total) + " is placed.");

  // reset everything
  cart = {};
  myCoupon = null;
  get("checkoutForm").reset();
  get("checkoutForm").style.display = "none";
  get("message").textContent = "";
  showAll();
});


// ================= 9. START =================

async function start() {
  try {
    products = await loadProducts();   // wait for products, then draw the page
    fillCategories();
    showAll();
  } catch (error) {
    get("productList").innerHTML = "<p class='small'>Could not load products. Check your internet and refresh.</p>";
  }
}

start();
