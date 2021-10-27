// combine path with new search params to get new url
export function buildURL(path, params) {
  const queryString = Object.entries(params).map(encodeParam).join("&");

  if (queryString === "") {
    return path;
  }

  // path has query string with trailing separator
  if (path.endsWith("&")) {
    return `${path}${queryString}`;
  }

  // path has query string, needs trailing separator
  if (path.includes("?")) {
    return `${path}&${queryString}`;
  }

  // path needs new query string
  return `${path}?${queryString}`;
}

function encodeParam([key, val]) {
  return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
}
