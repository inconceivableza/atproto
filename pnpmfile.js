const { resolutions } = JSON.parse(
  require("fs").readFileSync("../../package.json", "utf-8")
);

if (resolutions) {
  module.exports = {
    hooks: {
      readPackage,
    },
  };

  function readPackage(pkg, context) {
    console.log('***reading deps')
    if (pkg.dependencies) {
      for (const k in resolutions) {
        if (resolutions[k].startsWith("**/")) {
          console.log('updating',   resolutions[k], 'to', resolutions[k].slice(3))
          resolutions[k] = resolutions[k].slice(3)
        }
      }
    }

    return pkg;
  }
} else {
  module.exports = {};
}