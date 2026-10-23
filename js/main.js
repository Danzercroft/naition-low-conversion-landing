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

    const modal = document.getElementById('registration-modal');
    const section = document.getElementById('registration');
    const panel = section?.querySelector('.registration-panel');
    const supportsModal = modal instanceof HTMLDialogElement && typeof modal.showModal === 'function';

    // Одна и та же форма переносится в окно на время показа, чтобы не дублировать id.
    const openModal = () => {
        if (modal.open) {
            return;
        }
        modal.appendChild(panel);
        modal.showModal();
        modal.querySelector('input[name="name"]')?.focus();
        track('registration_modal_open');
    };

    if (supportsModal && panel) {
        modal.addEventListener('click', (event) => {
            const isCloseButton = event.target instanceof Element && event.target.closest('[data-modal-close]');
            if (event.target === modal || isCloseButton) {
                modal.close();
            }
        });
        modal.addEventListener('close', () => {
            section.appendChild(panel);
            track('registration_modal_close');
        });
    }

    document.querySelectorAll('[data-cta-placement]').forEach((link) => {
        link.addEventListener('click', (event) => {
            track('registration_cta_click', {
                placement: link.dataset.ctaPlacement,
            });

            if (supportsModal && panel && link.getAttribute('href') === '#registration') {
                event.preventDefault();
                openModal();
            }
        });
    });

    const hero = document.querySelector('.hero');
    const stickyCta = document.querySelector('.sticky-cta');
    if (hero && stickyCta && 'IntersectionObserver' in window) {
        const heroObserver = new IntersectionObserver(([entry]) => {
            document.body.classList.toggle('has-scrolled', !entry.isIntersecting);
        });
        heroObserver.observe(hero);
    }

    if (!form) {
        return;
    }

    let formStarted = false;

    form.addEventListener('input', (event) => {
        if (!formStarted) {
            formStarted = true;
            track('registration_form_start');
        }

        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            if (target.validity.valid) {
                target.removeAttribute('aria-invalid');
            }

            if (message) {
                message.textContent = '';
                message.className = 'form-message';
            }
        }
    });

    form.addEventListener(
        'invalid',
        (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                target.setAttribute('aria-invalid', 'true');
                track('registration_form_validation_error', {
                    field: target.name,
                });

                if (message && !message.textContent) {
                    const fieldLabels = {
                        name: 'Имя',
                        phone: 'Телефон',
                        email: 'E-mail',
                        purpose: 'Комментарий',
                    };
                    message.textContent = target.validity.valueMissing
                        ? `Заполните поле «${fieldLabels[target.name] || 'данные'}».`
                        : 'Проверьте формат введённых данных.';
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
