document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const message = document.getElementById('form-message');
    const track = (eventName, properties = {}) => {
        try {
            if (typeof window.posthog?.capture === 'function') {
                window.posthog.capture(eventName, properties);
            }
        } catch (error) {
            console.error('Не удалось отправить событие аналитики.', error);
        }
    };

    document.querySelectorAll('[data-cta-placement]').forEach((link) => {
        link.addEventListener('click', () => {
            track('registration_cta_click', {
                placement: link.dataset.ctaPlacement,
            });
        });
    });

    if (!form) {
        return;
    }

    let formStarted = false;

    form.addEventListener('input', () => {
        if (!formStarted) {
            formStarted = true;
            track('registration_form_start');
        }
    });

    form.addEventListener(
        'invalid',
        (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                track('registration_form_validation_error', {
                    field: target.name,
                });

                if (message) {
                    message.textContent = 'Проверьте обязательные поля и исправьте отмеченные ошибки.';
                    message.className = 'form-message error';
                }
            }
        },
        true,
    );

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);

        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
        }

        if (message) {
            message.textContent = '';
            message.className = 'form-message';
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Не удалось прочитать ответ сервера. Попробуйте ещё раз.');
            }

            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось отправить заявку.');
            }

            track('registration_form_success');

            if (message) {
                message.textContent = 'Спасибо! Мы сообщим вам дату нового курса и актуальную стоимость.';
                message.className = 'form-message success';
            }

            form.reset();
        } catch (error) {
            track('registration_form_error');

            if (message) {
                message.textContent = error instanceof Error
                    ? error.message
                    : 'Не удалось отправить заявку. Попробуйте ещё раз.';
                message.className = 'form-message error';
            }
        } finally {
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = false;
            }
        }
    });
});
