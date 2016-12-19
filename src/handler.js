import Chance from 'chance';
import moment from 'moment';
import AWS from 'aws-sdk';

const chance = new Chance();

const isLocal = process.env.NODE_ENV !== 'production';

const db = isLocal ?
  new AWS.DynamoDB({
    region: 'localhost',
    endpoint: `http://localhost:${process.env.DYNAMODB_PORT}`,
  }) :
  new AWS.DynamoDB();

const mapItem = item => (
  {
    id: item.id.S,
    name: item.name.S,
    createdUtc: item.createdUtc.S,
  }
);

const mapData = data => (
  {
    id: data.Attributes.id.S,
    name: data.Attributes.name.S,
  }
);

const createResponse = (statusCode, body) => (
  {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify(body),
  }
);

export const getOrders = (event, context, callback) => {
  console.log('getOrders', JSON.stringify(event));

  const params = {
    TableName: 'orders',
  };

  try {
    db.scan(params, (err, data) => {
      if (err) {
        callback(createResponse(500, { message: err.message || 'Internal server error' }));
      } else {
        callback(null, createResponse(200, { orders: data.Orders.map(mapItem) }));
      }
    });
  } catch (err) {
    callback(createResponse(500, { message: err.message || 'Internal server error' }));
  }
};

export const getItem = (event, context, callback) => {
  console.log('getItem', JSON.stringify(event));

  const path = isLocal ? event.path : event.pathParameters;

  const params = {
    TableName: 'orders',
    Key: {
      id: { S: path.id },
    },
  };

  try {
    db.getItem(params, (err, data) => {
      if (err) {
        callback(createResponse(500, { message: err.message || 'Internal server error' }));
      } else if (!data.Item) {
        callback(null, createResponse(404, { message: `An item could not be found with id: ${path.id}` }));
      } else {
        callback(null, createResponse(200, mapItem(data.Item)));
      }
    });
  } catch (err) {
    callback(createResponse(500, { message: err.message || 'Internal server error' }));
  }
};

export const createItem = (event, context, callback) => {
  console.log('createItem', JSON.stringify(event));

  const body = isLocal ? event.body : JSON.parse(event.body);

  const params = {
    Item: {
      id: {
        S: chance.guid(),
      },
      name: {
        S: body.name,
      },
      createdUtc: {
        S: moment().utc().toISOString(),
      },
    },
    TableName: 'orders',
    ConditionExpression: 'attribute_not_exists(id)',
  };

  try {
    db.putItem(params, (err) => {
      if (err) {
        callback(createResponse(500, { message: err.message || 'Internal server error' }));
      } else {
        callback(null, createResponse(200, mapItem(params.Item)));
      }
    });
  } catch (err) {
    callback(createResponse(500, { message: err.message || 'Internal server error' }));
  }
};

export const updateItem = (event, context, callback) => {
  console.log('updateItem', JSON.stringify(event));

  const path = isLocal ? event.path : event.pathParameters;
  const body = isLocal ? event.body : JSON.parse(event.body);

  const params = {
    TableName: 'orders',
    Key: {
      id: { S: path.id },
    },
    AttributeUpdates: {
      name: {
        Action: 'PUT',
        Value: { S: body.name },
      },
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    db.updateItem(params, (err, data) => {
      if (err) {
        callback(createResponse(500, { message: err.message || 'Internal server error' }));
      } else {
        callback(null, createResponse(200, mapData(data)));
      }
    });
  } catch (err) {
    callback(createResponse(500, { message: err.message || 'Internal server error' }));
  }
};

export const deleteItem = (event, context, callback) => {
  console.log('deleteItem', JSON.stringify(event));

  const path = isLocal ? event.path : event.pathParameters;

  const params = {
    TableName: 'orders',
    Key: {
      id: { S: path.id },
    },
  };

  try {
    db.deleteItem(params, (err) => {
      if (err) {
        callback(createResponse(500, { message: err.message || 'Internal server error' }));
      } else {
        callback(null, createResponse(200));
      }
    });
  } catch (err) {
    callback(createResponse(500, { message: err.message || 'Internal server error' }));
  }
};
