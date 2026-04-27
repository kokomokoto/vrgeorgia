const isProduction = process.env.NODE_ENV === 'production';

/**
 * სტაბილური საიდუმლო მხოლოდ development-ისთვის, როცა .env-ში JWT_SECRET არ არის.
 * პროდაქშენზე JWT_SECRET გარემოში აუცილებლად უნდა იყოს დაყენებული.
 */
const DEV_JWT_FALLBACK =
  'vrgeorgia_dev_only_jwt_secret_min_64_chars_do_not_use_in_production_7c4e9a2f1b8d5063';

let _secretResolved = false;
let _cachedSecret = '';

/**
 * JWT საიდუმლოს წაკითხვა ლენსად (პირველ sign/verify-ზე), რათა იმუშაოს server.js-ში
 * dotenv.config()-ის შემდეგ. ES მოდულებში import-ები იტვირთება ფაილის ზედა კოდამდე,
 * ამიტომ აქ process.env-ის წაკითხვა მოდულის ჩატვირთვის მომენტში ყოველთვის ცარიელი იყო.
 */
export function getJWTSecret() {
  if (_secretResolved) return _cachedSecret;

  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (configuredSecret) {
    _cachedSecret = configuredSecret;
  } else if (isProduction) {
    console.error('FATAL: JWT_SECRET is missing in production. Set it in your host environment variables.');
    process.exit(1);
  } else {
    console.warn(
      'JWT_SECRET is not set; using built-in dev fallback. Add JWT_SECRET to backend/.env for production or shared dev teams.'
    );
    _cachedSecret = DEV_JWT_FALLBACK;
  }

  _secretResolved = true;
  return _cachedSecret;
}

export function getJWTExpiresIn() {
  return process.env.JWT_EXPIRES_IN?.trim() || '7d';
}
