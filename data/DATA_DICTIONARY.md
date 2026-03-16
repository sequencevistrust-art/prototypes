# Data Dictionary

## events.csv

This dataset contains individual user interaction events enriched with product details.

| Field | Description | Source |
| :--- | :--- | :--- |
| `eventId` | Unique identifier for the specific event. | `events.csv` (event_id) |
| `sessionId` | Identifier for the user session in which the event occurred. | `events.csv` (session_id) |
| `timestamp` | The exact date and time when the event occurred (ISO 8601 format). | `events.csv` |
| `page` | The type of interaction or page visited (e.g., 'page_view', 'add_to_cart', 'checkout', 'purchase'). | `events.csv` (event_type) |
| `category` | The category of the product associated with the event. | `products.csv` |
| `productName` | The specific name of the product. | `products.csv` (name) |
| `payment` | The payment method used (populated only for relevant transaction events). | `events.csv` |

## record-attributes.csv

This dataset aggregates session-level metrics and combines them with customer demographic information.

| Field | Description | Source |
| :--- | :--- | :--- |
| `sessionId` | Unique identifier for the user session. | `sessions.csv` (session_id) |
| `customerId` | Unique identifier for the customer. | `sessions.csv` (customer_id) |
| `startTime` | The timestamp when the session began. | `sessions.csv` (start_time) |
| `device` | The type of device used for the session (e.g., mobile, desktop). | `sessions.csv` |
| `source` | The marketing source or channel that led to the session. | `sessions.csv` |
| `sessionCountry` | The country location detected for the specific session. | `sessions.csv` |
| `name` | The full name of the customer. | `customers.csv` |
| `email` | The email address of the customer. | `customers.csv` |
| `customerCountry` | The country associated with the customer's registered account. | `customers.csv` |
| `age` | The age of the customer. | `customers.csv` |
| `signupDate` | The date the customer registered an account. | `customers.csv` |
| `marketingOptIn` | Boolean indicating if the customer has opted in for marketing communications. | `customers.csv` |
| `totalEvents` | Total number of interactions recorded during the session. | Calculated from `events.csv` |
| `pageViews` | Number of 'page_view' events within the session. | Calculated from `events.csv` |
| `uniqueProductsViewed` | Count of distinct products viewed during the session. | Calculated from `events.csv` |
| `itemsAddedToCart` | Total number of 'add_to_cart' events in the session. | Calculated from `events.csv` |
| `reachedCheckout` | Boolean indicating if the user reached the checkout stage. | Calculated from `events.csv` |
| `converted` | Boolean indicating if a purchase was successfully completed. | Calculated from `events.csv` |
| `totalPurchaseAmount` | The total value of the purchase in USD (if converted). | Calculated from `events.csv` |
| `discountPercent` | The discount percentage applied to the purchase (if converted). | Calculated from `events.csv` |
| `paymentMethod` | The method of payment used for the transaction (if converted). | Calculated from `events.csv` |
| `finalCartSize` | The number of items in the cart at the end of the session. | Calculated from `events.csv` |
