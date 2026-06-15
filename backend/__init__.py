try:
    from .churvox_stripe_no_card import install_no_card_trial_defaults
    install_no_card_trial_defaults()
except Exception:
    try:
        from churvox_stripe_no_card import install_no_card_trial_defaults
        install_no_card_trial_defaults()
    except Exception:
        pass
