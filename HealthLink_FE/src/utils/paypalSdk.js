export const loadPayPalSdk = (clientId, currency = 'USD') => {
  const scriptId = `paypal-js-sdk-${currency}`;
  const existingScript = document.getElementById(scriptId);

  if (existingScript) {
    if (window.paypal) {
      return Promise.resolve(window.paypal);
    }
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(window.paypal), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};
