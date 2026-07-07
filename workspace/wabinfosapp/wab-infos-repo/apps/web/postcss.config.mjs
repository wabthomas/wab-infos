const config = {
  plugins:
    process.env.PRECOMPILED_CSS === '1'
      ? {}
      : {
          '@tailwindcss/postcss': {},
        },
};

export default config;
