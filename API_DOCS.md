# Revenue Statistics API Documentation

## Endpoint
`GET /v1/revenues`

## Description
Retrieves revenue statistics based on completed orders. Supports filtering by date range, grouping by time period, and scoping by overall revenue or product-specific sales.

## Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startDate` | String (YYYY-MM-DD) | No | - | Filter orders starting from this date. |
| `endDate` | String (YYYY-MM-DD) | No | - | Filter orders up to this date. |
| `type` | String | No | `day` | Grouping interval. Options: `day`, `month`. |
| `scope` | String | No | `revenue` | Scope of statistics. Options: `revenue` (total), `product` (by product). |

## Examples

### 1. Get Total Revenue by Day
**Request:**
```http
GET /v1/revenues?startDate=2023-01-01&endDate=2023-01-31&type=day
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "date": "2023-01-01",
        "revenue": "1500000",
        "order_count": 10
      },
      {
        "date": "2023-01-02",
        "revenue": "2000000",
        "order_count": 15
      }
    ]
  }
}
```

### 2. Get Total Revenue by Month
**Request:**
```http
GET /v1/revenues?type=month
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "date": "2023-01",
        "revenue": "45000000",
        "order_count": 300
      }
    ]
  }
}
```

### 3. Get Product Revenue Statistics
**Request:**
```http
GET /v1/revenues?startDate=2023-01-01&endDate=2023-01-31&scope=product
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "date": "2023-01-01",
        "product_name": "Trà sữa truyền thống",
        "toppings": "Trân châu đen",
        "total_quantity": "50",
        "total_revenue": "2500000"
      },
      {
        "date": "2023-01-01",
        "product_name": "Trà trái cây",
        "toppings": null,
        "total_quantity": "30",
        "total_revenue": "1500000"
      }
    ]
  }
}
```

## Notes
- Revenue calculations include the base price of the product plus any selected toppings.
- Only completed orders (`is_completed = 1`) are included in the statistics.
