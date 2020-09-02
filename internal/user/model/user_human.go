package model

import (
	"time"

	policy_model "github.com/caos/zitadel/internal/policy/model"

	"github.com/caos/zitadel/internal/crypto"
	es_models "github.com/caos/zitadel/internal/eventstore/models"
)

type Human struct {
	*Password
	*Profile
	*Email
	*Phone
	*Address
	InitCode     *InitUserCode
	EmailCode    *EmailCode
	PhoneCode    *PhoneCode
	PasswordCode *PasswordCode
	OTP          *OTP
}

type InitUserCode struct {
	es_models.ObjectRoot

	Code   *crypto.CryptoValue
	Expiry time.Duration
}

type Gender int32

const (
	GenderUnspecified Gender = iota
	GenderFemale
	GenderMale
	GenderDiverse
)

func (u *Human) SetNamesAsDisplayname() {
	if u.Profile != nil && u.DisplayName == "" && u.FirstName != "" && u.LastName != "" {
		u.DisplayName = u.FirstName + " " + u.LastName
	}
}

func (u *Human) IsValid() bool {
	return u.Profile != nil && u.FirstName != "" && u.LastName != "" && u.Email != nil && u.Email.IsValid() && u.Phone == nil || (u.Phone != nil && u.Phone.IsValid())
}

func (u *Human) IsInitialState() bool {
	return u.Email == nil || !u.IsEmailVerified || u.Password == nil || u.SecretString == ""
}

func (u *Human) IsOTPReady() bool {
	return u.OTP != nil && u.OTP.State == MfaStateReady
}

func (u *Human) HashPasswordIfExisting(policy *policy_model.PasswordComplexityPolicy, passwordAlg crypto.HashAlgorithm, onetime bool) error {
	if u.Password != nil {
		return u.Password.HashPasswordIfExisting(policy, passwordAlg, onetime)
	}
	return nil
}

func (u *Human) GenerateInitCodeIfNeeded(initGenerator crypto.Generator) error {
	if !u.IsInitialState() {
		return nil
	}
	u.InitCode = new(InitUserCode)
	return u.InitCode.GenerateInitUserCode(initGenerator)
}

func (u *Human) GeneratePhoneCodeIfNeeded(phoneGenerator crypto.Generator) error {
	if u.Phone == nil || u.IsPhoneVerified {
		return nil
	}
	u.PhoneCode = new(PhoneCode)
	return u.PhoneCode.GeneratePhoneCode(phoneGenerator)
}

func (u *Human) GenerateEmailCodeIfNeeded(emailGenerator crypto.Generator) error {
	if u.Email == nil || u.IsEmailVerified {
		return nil
	}
	u.EmailCode = new(EmailCode)
	return u.EmailCode.GenerateEmailCode(emailGenerator)
}

func (init *InitUserCode) GenerateInitUserCode(generator crypto.Generator) error {
	initCodeCrypto, _, err := crypto.NewCode(generator)
	if err != nil {
		return err
	}
	init.Code = initCodeCrypto
	init.Expiry = generator.Expiry()
	return nil
}