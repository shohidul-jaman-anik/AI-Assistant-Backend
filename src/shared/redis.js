import redis from 'redis';
const { createClient } = redis;
const config = require('../config');

const redisClient = createClient({
  url: config.redis.url,
});

const redisPubClient = createClient({
  url: config.redis.url,
});

const redisSubClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', error => console.log('RedisError', error));
redisClient.on('connect', () => console.log('Redis Connected'));

const connect = async () => {
  await redisClient.connect();
  await redisPubClient.connect();
  await redisSubClient.connect();
};

const set = async (key, value, options) => {
  await redisClient.set(key, value, options);
};

const get = async key => {
  return await redisClient.get(key);
};

const del = async key => {
  await redisClient.del(key);
};

const setAccessToken = async (userId, token) => {
  const key = `access-token:${userId}`;
  await redisClient.set(key, token, { EX: Number(config.redis.expires_in) });
};

const getAccessToken = async userId => {
  const key = `access-token:${userId}`;
  return await redisClient.get(key);
};

const delAccessToken = async userId => {
  const key = `access-token:${userId}`;
  await redisClient.del(key);
};

const disconnect = async () => {
  await redisClient.quit();
  await redisPubClient.quit();
  await redisSubClient.quit();
};

export default {
  connect,
  publish: redisPubClient.publish.bind(redisPubClient),
  subscribe: redisSubClient.subscribe.bind(redisSubClient),
  set,
  get,
  del,
  disconnect,
  setAccessToken,
  getAccessToken,
  delAccessToken,
};

